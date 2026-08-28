import React, { useState, useEffect } from 'react';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Download,
  ShoppingBag,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';
import { exportMedicinesToCSV } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';

const DEFAULT_SUPPLIERS = [
  {
    id: 'sup-1',
    name: 'Apex Pharma Distributors',
    contactPerson: 'Rajesh Sharma',
    phone: '+91 98230 45892',
    email: 'orders@apexpharma.in',
    address: '42 Central Wholesale Market, Mumbai, MH',
    licenseNo: 'DL-20B/21B-48192',
    categories: ['Antibiotics', 'Analgesics', 'Cardiovascular'],
  },
  {
    id: 'sup-2',
    name: 'MediCare Healthcare Logistics',
    contactPerson: 'Sunil Verma',
    phone: '+91 98450 11234',
    email: 'supply@medicarelogistics.com',
    address: '10 Industrial Area, Pune, MH',
    licenseNo: 'DL-20B/21B-90214',
    categories: ['Syrups', 'Ointments', 'Vitamins & Supplements'],
  },
  {
    id: 'sup-3',
    name: 'Global Biotech & Vaccines',
    contactPerson: 'Dr. Ananya Sen',
    phone: '+91 98110 77452',
    email: 'distribution@globalbiotech.com',
    address: 'Plot 7 Biotech Park, Hyderabad, TS',
    licenseNo: 'DL-20B/21B-33109',
    categories: ['Emergency Care', 'Ophthalmic', 'Antidiabetic'],
  },
];

const SuppliersModule = ({ medicines = [], onNavigateTab }) => {
  const { showSuccess, showError } = useToast();
  
  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const storageKey = currentUser?._id
    ? `mediaalert_suppliers_${currentUser._id}`
    : 'mediaalert_suppliers';

  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
    } catch {
      return DEFAULT_SUPPLIERS;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    licenseNo: '',
    categories: '',
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(suppliers));
  }, [suppliers, storageKey]);

  const lowStockMedicines = medicines.filter((m) => {
    const qty = Number(m.quantity) || 0;
    const min = Number(m.minimumStock) || 10;
    return qty <= min;
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      licenseNo: '',
      categories: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      licenseNo: sup.licenseNo,
      categories: Array.isArray(sup.categories) ? sup.categories.join(', ') : sup.categories,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this supplier from directory?')) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
      showSuccess('Supplier removed from directory.');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const catArray = formData.categories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingSupplier) {
      setSuppliers(
        suppliers.map((s) =>
          s.id === editingSupplier.id
            ? { ...s, ...formData, categories: catArray }
            : s
        )
      );
      showSuccess('Supplier details updated.');
    } else {
      const newSup = {
        id: `sup-${Date.now()}`,
        ...formData,
        categories: catArray,
      };
      setSuppliers([...suppliers, newSup]);
      showSuccess('New supplier added to directory.');
    }
    setIsModalOpen(false);
  };

  const handleExportReorderSheet = () => {
    if (lowStockMedicines.length === 0) {
      showSuccess('No low stock items. Inventory levels are adequate.');
      return;
    }
    exportMedicinesToCSV(lowStockMedicines, 'MediaAlert_Supplier_Reorder_Sheet.csv');
    showSuccess('Purchase reorder sheet exported to CSV.');
  };

  return (
    <div className="suppliers-module-container">
      
      {/* Header */}
      <div className="module-header-row">
        <div>
          <h2>Supplier & Distributor Directory</h2>
          <p>Maintain verified pharmaceutical distributors, drug license certificates, and order catalogs</p>
        </div>

        <div className="flex-align-gap">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('invoices')}
              className="btn-secondary btn-icon-text"
              title="Upload and scan supplier PDF invoice"
            >
              <FileSpreadsheet size={15} color="#2563eb" /> Scan Supplier Bill (PDF)
            </button>
          )}
          {lowStockMedicines.length > 0 && (
            <button onClick={handleExportReorderSheet} className="btn-secondary btn-icon-text">
              <Download size={15} /> Export Reorder Sheet ({lowStockMedicines.length})
            </button>
          )}
          <button onClick={handleOpenAdd} className="btn-primary btn-icon-text">
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* Supplier Cards Grid */}
      <div className="suppliers-grid">
        {suppliers.map((sup) => (
          <div key={sup.id} className="supplier-card">
            
            <div className="supplier-card-header">
              <div className="supplier-brand-bubble">
                <Truck size={20} color="#2563eb" />
              </div>
              <div className="supplier-title-wrap">
                <h3>{sup.name}</h3>
                <span className="supplier-contact-name">Contact: {sup.contactPerson}</span>
              </div>
            </div>

            <div className="supplier-card-body">
              <div className="supplier-info-line">
                <Phone size={14} className="text-slate-500" />
                <a href={`tel:${sup.phone}`} className="text-link">{sup.phone}</a>
              </div>

              <div className="supplier-info-line">
                <Mail size={14} className="text-slate-500" />
                <a href={`mailto:${sup.email}`} className="text-link">{sup.email}</a>
              </div>

              <div className="supplier-info-line">
                <MapPin size={14} className="text-slate-500" />
                <span>{sup.address}</span>
              </div>

              <div className="supplier-info-line font-mono text-xs text-slate-600">
                <FileText size={14} className="text-slate-500" />
                <span>DL No: {sup.licenseNo}</span>
              </div>

              {sup.categories && sup.categories.length > 0 && (
                <div className="supplier-categories-wrap">
                  {sup.categories.map((cat, idx) => (
                    <span key={idx} className="category-pill">{cat}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="supplier-card-footer">
              <button onClick={() => handleOpenEdit(sup)} className="btn-secondary btn-sm">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => handleDelete(sup.id)} className="btn-text-danger btn-sm">
                <Trash2 size={13} /> Delete
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add Pharmaceutical Supplier'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-close">&times;</button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group full-width">
                <label>Company / Distributor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Pharma Wholesale Ltd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98230 45892"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. orders@apexpharma.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Drug License (DL) Number</label>
                <input
                  type="text"
                  placeholder="e.g. 20B/21B-48192"
                  value={formData.licenseNo}
                  onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Physical Warehouse Address</label>
                <input
                  type="text"
                  placeholder="e.g. 42 Central Wholesale Market, Mumbai"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Supplied Categories (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Antibiotics, Analgesics, Syrups"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuppliersModule;
