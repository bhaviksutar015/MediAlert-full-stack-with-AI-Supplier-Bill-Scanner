import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Building2,
  Calendar,
  FileSpreadsheet,
  Receipt,
  Layers,
  ArrowRight,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ExtractedMedicineTable = ({
  invoiceData,
  medicines = [],
  failedPages = [],
  onUpdateMedicines,
  onUpdateInvoiceData,
  onProceedToImport,
  onResetScan,
  isCheckingDuplicates,
}) => {
  const { showWarning } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // --- DERIVED CATEGORIES ---
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    medicines.forEach((m) => {
      if (m.category && m.category.trim()) set.add(m.category.trim());
    });
    return Array.from(set).sort();
  }, [medicines]);

  // --- FILTERING ---
  const filteredMedicines = useMemo(() => {
    return medicines.filter((item) => {
      // Search term match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (item.medicineName || '').toLowerCase().includes(query);
        const matchesGeneric = (item.genericName || '').toLowerCase().includes(query);
        const matchesBatch = (item.batchNumber || '').toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesGeneric && !matchesBatch && !matchesCat) return false;
      }

      // Confidence match
      if (confidenceFilter === 'needs-review') {
        if ((item.confidence || 1) >= 0.70) return false;
      } else if (confidenceFilter === 'high') {
        if ((item.confidence || 1) < 0.85) return false;
      }

      // Category match
      if (categoryFilter !== 'all') {
        if ((item.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [medicines, searchTerm, confidenceFilter, categoryFilter]);

  // --- SELECTION STATS ---
  const selectedMedicines = useMemo(() => {
    return medicines.filter((m) => m.selected);
  }, [medicines]);

  const allSelected = medicines.length > 0 && selectedMedicines.length === medicines.length;

  const totalSelectedUnits = useMemo(() => {
    return selectedMedicines.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [selectedMedicines]);

  const totalSelectedValue = useMemo(() => {
    return selectedMedicines.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
  }, [selectedMedicines]);

  // --- HANDLERS ---
  const handleToggleSelectAll = () => {
    const newSelectState = !allSelected;
    onUpdateMedicines(
      medicines.map((m) => ({ ...m, selected: newSelectState }))
    );
  };

  const handleToggleRowSelect = (tempId) => {
    onUpdateMedicines(
      medicines.map((m) => (m.tempId === tempId ? { ...m, selected: !m.selected } : m))
    );
  };

  const handleFieldChange = (tempId, field, value) => {
    onUpdateMedicines(
      medicines.map((m) => {
        if (m.tempId === tempId) {
          const updated = { ...m, [field]: value };
          // Auto update totalAmount if quantity or unitPrice changes
          if (field === 'quantity' || field === 'unitPrice') {
            const q = field === 'quantity' ? Number(value) || 0 : Number(m.quantity) || 0;
            const p = field === 'unitPrice' ? Number(value) || 0 : Number(m.unitPrice) || 0;
            if (p > 0) updated.totalAmount = +(q * p).toFixed(2);
          }
          return updated;
        }
        return m;
      })
    );
  };

  const handleDeleteRow = (tempId) => {
    onUpdateMedicines(medicines.filter((m) => m.tempId !== tempId));
  };

  const handleAddManualRow = () => {
    const newRow = {
      tempId: `manual_${Date.now()}`,
      medicineName: '',
      brandName: '',
      genericName: '',
      category: 'General',
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      quantity: 10,
      unitType: 'Strips',
      unitPrice: 0,
      totalAmount: 0,
      confidence: 1.0,
      sourcePage: 1,
      selected: true,
    };
    onUpdateMedicines([newRow, ...medicines]);
  };

  const handleProceedClick = () => {
    if (selectedMedicines.length === 0) {
      showWarning('Please select at least one medicine to import.');
      return;
    }

    // Validate required fields on selected medicines
    for (const item of selectedMedicines) {
      if (!item.medicineName || !item.medicineName.trim()) {
        showWarning('All selected medicines must have a valid Medicine Name.');
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        showWarning(`Medicine "${item.medicineName}" must have a valid quantity greater than 0.`);
        return;
      }
      if (!item.expiryDate) {
        showWarning(`Medicine "${item.medicineName}" requires a valid Expiry Date.`);
        return;
      }
    }

    onProceedToImport();
  };

  // Helper for date formatting in input date
  const formatIsoDate = (d) => {
    if (!d) return '';
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return d;
      return parsed.toISOString().split('T')[0];
    } catch {
      return d;
    }
  };

  return (
    <div className="invoice-scanner-container">
      
      {/* 1. Failed Pages Alert (if any) */}
      {failedPages && failedPages.length > 0 && (
        <div className="failed-pages-banner">
          <div className="flex-align-gap">
            <ShieldAlert size={18} />
            <span>
              <strong>Note on Multi-page Scan:</strong> {failedPages.length} page(s) (Pages: {failedPages.map(f => f.page).join(', ')}) had unreadable text or scanning errors, but the remaining pages were successfully parsed below.
            </span>
          </div>
        </div>
      )}

      {/* 2. Top Invoice Summary Metadata Banner */}
      <div className="invoice-metadata-banner">
        
        <div className="invoice-meta-stat">
          <span className="meta-stat-label">Supplier / Distributor</span>
          <input
            type="text"
            className="meta-stat-value editable-meta"
            placeholder="e.g. Apex Pharma Wholesale"
            value={invoiceData?.supplierName || ''}
            onChange={(e) => onUpdateInvoiceData('supplierName', e.target.value)}
          />
        </div>

        <div className="invoice-meta-stat">
          <span className="meta-stat-label">Invoice Number</span>
          <input
            type="text"
            className="meta-stat-value editable-meta"
            placeholder="e.g. INV-904812"
            value={invoiceData?.invoiceNumber || ''}
            onChange={(e) => onUpdateInvoiceData('invoiceNumber', e.target.value)}
          />
        </div>

        <div className="invoice-meta-stat">
          <span className="meta-stat-label">Invoice Date</span>
          <input
            type="date"
            className="meta-stat-value editable-meta"
            value={formatIsoDate(invoiceData?.invoiceDate)}
            onChange={(e) => onUpdateInvoiceData('invoiceDate', e.target.value)}
          />
        </div>

        <div className="invoice-meta-stat">
          <span className="meta-stat-label">Total Invoice Value (₹)</span>
          <span className="meta-stat-value text-blue-600">
            {invoiceData?.totalInvoiceAmount
              ? `₹${Number(invoiceData.totalInvoiceAmount).toLocaleString('en-IN')}`
              : totalSelectedValue > 0
              ? `₹${totalSelectedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : '—'}
          </span>
        </div>

        <div className="invoice-meta-stat">
          <span className="meta-stat-label">Total Medicines Found</span>
          <span className="meta-stat-value text-emerald-600">
            {medicines.length} items
          </span>
        </div>

      </div>

      {/* 3. Review & Edit Data Grid Card */}
      <div className="extracted-table-card">
        
        {/* Table Toolbar */}
        <div className="extracted-table-toolbar">
          
          <div className="toolbar-left-group">
            
            {/* Search Input */}
            <div className="table-search-input-wrap">
              <Search size={14} className="table-search-icon" />
              <input
                type="text"
                placeholder="Search extracted medicines, batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Confidence Filter */}
            <select
              className="filter-confidence-select"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              aria-label="Filter by confidence score"
            >
              <option value="all">All Confidence Levels</option>
              <option value="needs-review">⚠️ Needs Review (&lt; 70%)</option>
              <option value="high">✓ High Confidence (&ge; 85%)</option>
            </select>

            {/* Category Filter */}
            {uniqueCategories.length > 0 && (
              <select
                className="filter-confidence-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All Categories ({uniqueCategories.length})</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

          </div>

          <div className="toolbar-right-group">
            
            <button
              onClick={handleToggleSelectAll}
              className="btn-secondary btn-sm flex-align-gap"
              title="Toggle select all items"
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </button>

            <button
              onClick={handleAddManualRow}
              className="btn-secondary btn-sm flex-align-gap"
              title="Add a manual medicine row"
            >
              <Plus size={14} /> <span>Add Row</span>
            </button>

          </div>

        </div>

        {/* Scrollable Data Grid */}
        <div className="table-scroll-wrapper">
          <table className="extracted-grid-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all medicines"
                  />
                </th>
                <th style={{ minWidth: '200px' }}>Medicine Name *</th>
                <th style={{ minWidth: '160px' }}>Generic Formula</th>
                <th style={{ minWidth: '130px' }}>Category</th>
                <th style={{ minWidth: '120px' }}>Batch No</th>
                <th style={{ minWidth: '130px' }}>Expiry Date *</th>
                <th style={{ minWidth: '90px', textAlign: 'right' }}>Qty *</th>
                <th style={{ minWidth: '100px' }}>Unit Form</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Unit Price (₹)</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ minWidth: '110px' }}>Confidence</th>
                <th style={{ minWidth: '60px' }}>Page</th>
                <th style={{ width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--slate-500)' }}>
                    No medicines match the active search or confidence filter.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((item) => {
                  const isLowConf = (item.confidence || 1) < 0.70;
                  const isHighConf = (item.confidence || 1) >= 0.85;

                  return (
                    <tr
                      key={item.tempId}
                      className={`${isLowConf ? 'row-needs-review' : ''} ${!item.selected ? 'row-deselected' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected || false}
                          onChange={() => handleToggleRowSelect(item.tempId)}
                          aria-label={`Select ${item.medicineName}`}
                        />
                      </td>

                      {/* Medicine Name */}
                      <td>
                        <input
                          type="text"
                          className={`table-cell-input font-medium ${!item.medicineName ? 'input-invalid' : ''}`}
                          placeholder="e.g. Paracetamol 500mg"
                          value={item.medicineName || ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'medicineName', e.target.value)}
                        />
                      </td>

                      {/* Generic Name */}
                      <td>
                        <input
                          type="text"
                          className="table-cell-input text-slate-600"
                          placeholder="e.g. Paracetamol"
                          value={item.genericName || ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'genericName', e.target.value)}
                        />
                      </td>

                      {/* Category */}
                      <td>
                        <input
                          type="text"
                          list="invoice-categories"
                          className="table-cell-input"
                          placeholder="Category"
                          value={item.category || ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'category', e.target.value)}
                        />
                      </td>

                      {/* Batch Number */}
                      <td>
                        <input
                          type="text"
                          className="table-cell-input font-mono text-xs"
                          placeholder="Batch / Lot"
                          value={item.batchNumber || ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'batchNumber', e.target.value)}
                        />
                      </td>

                      {/* Expiry Date */}
                      <td>
                        <input
                          type="text"
                          className={`table-cell-input ${!item.expiryDate ? 'input-invalid' : ''}`}
                          placeholder="YYYY-MM or YYYY-MM-DD"
                          value={item.expiryDate || ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'expiryDate', e.target.value)}
                        />
                      </td>

                      {/* Quantity */}
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="table-cell-input input-num font-semibold"
                          value={item.quantity !== undefined ? item.quantity : 1}
                          onChange={(e) => handleFieldChange(item.tempId, 'quantity', e.target.value)}
                        />
                      </td>

                      {/* Unit Form */}
                      <td>
                        <select
                          className="table-cell-input"
                          value={item.unitType || 'Strips'}
                          onChange={(e) => handleFieldChange(item.tempId, 'unitType', e.target.value)}
                        >
                          <option value="Tablets">Tablets</option>
                          <option value="Strips">Strips</option>
                          <option value="Bottles">Bottles</option>
                          <option value="Boxes">Boxes</option>
                          <option value="Vials">Vials</option>
                          <option value="Ampoules">Ampoules</option>
                          <option value="Packs">Packs</option>
                          <option value="Units">Units</option>
                        </select>
                      </td>

                      {/* Unit Price */}
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="table-cell-input input-num"
                          placeholder="0.00"
                          value={item.unitPrice !== null && item.unitPrice !== undefined ? item.unitPrice : ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'unitPrice', e.target.value)}
                        />
                      </td>

                      {/* Total Amount */}
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="table-cell-input input-num text-slate-600"
                          placeholder="0.00"
                          value={item.totalAmount !== null && item.totalAmount !== undefined ? item.totalAmount : ''}
                          onChange={(e) => handleFieldChange(item.tempId, 'totalAmount', e.target.value)}
                        />
                      </td>

                      {/* Confidence Score */}
                      <td>
                        <span
                          className={`confidence-badge ${
                            isHighConf
                              ? 'confidence-high'
                              : isLowConf
                              ? 'confidence-low'
                              : 'confidence-mid'
                          }`}
                          title={`Extraction confidence score: ${(item.confidence * 100).toFixed(0)}%`}
                        >
                          {isLowConf ? (
                            <>
                              <AlertTriangle size={11} /> Needs Review
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} /> {(item.confidence * 100).toFixed(0)}%
                            </>
                          )}
                        </span>
                      </td>

                      {/* Source Page */}
                      <td>
                        <span className="page-tag-badge">
                          p. {item.sourcePage || 1}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        <button
                          onClick={() => handleDeleteRow(item.tempId)}
                          className="btn-icon-danger"
                          title="Delete row"
                          aria-label="Delete row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Global Datalist for Categories */}
        <datalist id="invoice-categories">
          <option value="Antibiotics" />
          <option value="Analgesics / Pain Relief" />
          <option value="Antipyretic / Fever" />
          <option value="Cardiovascular" />
          <option value="Antidiabetic" />
          <option value="Syrups & Suspensions" />
          <option value="Dermatological / Ointments" />
          <option value="Vitamins & Supplements" />
          <option value="Ophthalmic / Eye Drops" />
          <option value="Emergency Care" />
          <option value="General" />
        </datalist>

        {/* Table Footer & Actions */}
        <div className="extracted-table-footer">
          
          <div className="footer-stats-group">
            <div>
              <span>Selected Items: </span>
              <strong className="footer-stat-highlight">
                {selectedMedicines.length} of {medicines.length}
              </strong>
            </div>

            <div>
              <span>Total Units: </span>
              <strong className="footer-stat-highlight">
                {totalSelectedUnits.toLocaleString()} units
              </strong>
            </div>

            <div>
              <span>Total Value: </span>
              <strong className="footer-stat-highlight text-blue-600">
                ₹{totalSelectedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="footer-actions-group">
            <button
              type="button"
              onClick={onResetScan}
              className="btn-secondary"
            >
              <RotateCcw size={14} /> Scan Another Invoice
            </button>

            <button
              type="button"
              onClick={handleProceedClick}
              disabled={selectedMedicines.length === 0 || isCheckingDuplicates}
              className="btn-primary flex-align-gap"
            >
              {isCheckingDuplicates ? (
                'Checking Duplicates...'
              ) : (
                <>
                  <span>Add Selected Medicines to Inventory ({selectedMedicines.length})</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ExtractedMedicineTable;
