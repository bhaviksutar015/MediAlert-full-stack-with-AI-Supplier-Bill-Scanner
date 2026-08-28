import React, { useState } from 'react';
import axios from 'axios';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Printer,
  CheckCircle2,
  User,
  FileText
} from 'lucide-react';
import {
  getDaysUntilExpiry,
  formatCurrency,
  formatDate
} from '../../utils/medicineUtils';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../config/api';

const BillingModule = ({ medicines = [], onRefreshInventory }) => {
  const { showSuccess, showError, showWarning } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Search filtered medicines (only with positive stock)
  const matchingMedicines = searchTerm.trim()
    ? medicines.filter((m) => {
        const term = searchTerm.toLowerCase();
        return (
          (m.name || '').toLowerCase().includes(term) ||
          (m.genericName || '').toLowerCase().includes(term) ||
          (m.batchNumber || '').toLowerCase().includes(term)
        );
      })
    : [];

  const handleAddToCart = (med) => {
    const days = getDaysUntilExpiry(med.expiryDate);
    if (days < 0) {
      showError(`SAFETY WARNING: Cannot dispense "${med.name}" - this batch is EXPIRED!`);
      return;
    }

    if (Number(med.quantity) <= 0) {
      showWarning(`"${med.name}" is currently out of stock.`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.medicine._id === med._id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (currentQty >= Number(med.quantity)) {
        showWarning(`Cannot add more than available stock (${med.quantity} Units).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { medicine: med, qty: 1 }]);
    }
  };

  const handleUpdateQty = (medId, delta) => {
    const updated = cart
      .map((item) => {
        if (item.medicine._id === medId) {
          const newQty = item.qty + delta;
          if (newQty > Number(item.medicine.quantity)) {
            showWarning(`Max available stock is ${item.medicine.quantity} units.`);
            return item;
          }
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      })
      .filter(Boolean);
    setCart(updated);
  };

  const handleRemoveItem = (medId) => {
    setCart(cart.filter((item) => item.medicine._id !== medId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.qty * (Number(item.medicine.price) || 0),
    0
  );
  const taxAmount = subtotal * 0.05; // 5% GST for medicines
  const grandTotal = subtotal + taxAmount;

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showWarning('Cart is empty. Please add medicines to bill.');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Decrement quantities on backend
      for (const item of cart) {
        const remainingStock = Math.max(0, Number(item.medicine.quantity) - item.qty);
        await axios.put(
          `${API_BASE_URL}/api/medicines/${item.medicine._id}`,
          { quantity: remainingStock },
          { headers }
        );
      }

      const invoiceData = {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString(),
        patientName: patientName || 'Walk-in Customer',
        patientPhone: patientPhone || 'N/A',
        doctorName: doctorName || 'N/A',
        items: [...cart],
        subtotal,
        taxAmount,
        grandTotal,
      };

      setLastInvoice(invoiceData);
      setCart([]);
      setPatientName('');
      setPatientPhone('');
      setDoctorName('');
      showSuccess(`Dispensed invoice ${invoiceData.invoiceNumber} successfully! Stock updated.`);
      
      if (onRefreshInventory) onRefreshInventory();
    } catch (err) {
      console.error('Dispensing error:', err);
      showError('Failed to record dispensing. Please check network connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!lastInvoice) return;
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${lastInvoice.invoiceNumber}</title>
          <style>
            body { font-family: sans-serif; margin: 30px; color: #1e293b; font-size: 13px; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
            .pharmacy-name { font-size: 20px; font-weight: 700; color: #1e40af; }
            .inv-meta { display: flex; justify-content: space-between; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .totals { margin-top: 16px; text-align: right; }
            .grand-total { font-size: 16px; font-weight: 700; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="pharmacy-name">MediaAlert Medicals & Pharmacy</div>
            <div>Licensed Chemist & Druggist • DL No: 20B/21B-MH-49201</div>
          </div>
          <div class="inv-meta">
            <div>
              <strong>Invoice:</strong> ${lastInvoice.invoiceNumber}<br/>
              <strong>Date:</strong> ${lastInvoice.date}
            </div>
            <div>
              <strong>Patient:</strong> ${lastInvoice.patientName} (${lastInvoice.patientPhone})<br/>
              <strong>Doctor:</strong> Dr. ${lastInvoice.doctorName}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item / Formula</th>
                <th>Batch</th>
                <th>Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lastInvoice.items.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.medicine.name}</strong><br/><small style="color: #64748b;">${it.medicine.genericName || ''}</small></td>
                  <td>${it.medicine.batchNumber || '-'}</td>
                  <td>${it.qty}</td>
                  <td style="text-align: right;">₹${(Number(it.medicine.price) || 0).toFixed(2)}</td>
                  <td style="text-align: right;">₹${(it.qty * (Number(it.medicine.price) || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div>Subtotal: ₹${lastInvoice.subtotal.toFixed(2)}</div>
            <div>GST (5%): ₹${lastInvoice.taxAmount.toFixed(2)}</div>
            <div class="grand-total">Total Paid: ₹${lastInvoice.grandTotal.toFixed(2)}</div>
          </div>
          <div style="margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center;">
            Thank you for choosing MediaAlert Pharmacy. Get well soon!
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(invoiceHTML);
      w.document.close();
    }
  };

  return (
    <div className="billing-module-container">
      
      {/* Header */}
      <div className="module-header-row">
        <div>
          <h2>Point of Sale (POS) & Counter Dispensing</h2>
          <p>Quick patient dispensing with automatic expiry safety barriers and real-time inventory decrement</p>
        </div>
      </div>

      <div className="billing-grid">
        
        {/* Left: Search & Medicine Selection */}
        <div className="billing-left-panel">
          
          <div className="pos-search-card">
            <label className="pos-search-label">
              <Search size={16} /> Search Inventory to Dispense:
            </label>
            <input
              type="text"
              placeholder="Search medicine name, generic formula, or batch..."
              className="pos-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Search Results List */}
          <div className="pos-results-container">
            {searchTerm.trim() === '' ? (
              <div className="pos-search-hint">
                <Search size={32} color="#94a3b8" />
                <p>Type medicine name above to search available stock</p>
              </div>
            ) : matchingMedicines.length === 0 ? (
              <div className="pos-search-hint">
                <AlertCircle size={32} color="#94a3b8" />
                <p>No matching medicines found in active inventory</p>
              </div>
            ) : (
              <div className="pos-items-list">
                {matchingMedicines.map((med) => {
                  const days = getDaysUntilExpiry(med.expiryDate);
                  const isExpired = days < 0;
                  const isNearExpiry = days >= 0 && days <= 30;
                  const isOutOfStock = Number(med.quantity) <= 0;

                  return (
                    <div
                      key={med._id}
                      className={`pos-item-card ${isExpired ? 'pos-item-expired' : isNearExpiry ? 'pos-item-warning' : ''}`}
                    >
                      <div className="pos-item-info">
                        <div className="flex-align-gap">
                          <strong className="pos-item-name">{med.name}</strong>
                          {isExpired && <span className="alert-badge-danger">EXPIRED</span>}
                          {isNearExpiry && <span className="alert-badge-warning">Expiring ({days}d)</span>}
                        </div>
                        <div className="pos-item-details">
                          <span>Batch: {med.batchNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>Stock: <strong>{med.quantity} Units</strong></span>
                          <span>•</span>
                          <span className="pos-item-price">{formatCurrency(med.price || 0)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(med)}
                        disabled={isExpired || isOutOfStock}
                        className={isExpired ? 'btn-danger-outline btn-sm' : 'btn-primary btn-sm'}
                        title={isExpired ? 'Cannot dispense expired drug' : 'Add to counter bill'}
                      >
                        {isExpired ? 'Expired' : isOutOfStock ? 'No Stock' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right: Dispensing Cart & Checkout */}
        <div className="billing-right-panel">
          
          <div className="pos-cart-card">
            <div className="pos-cart-header">
              <div className="flex-align-gap">
                <ShoppingCart size={20} color="#2563eb" />
                <h3>Dispense Cart ({cart.reduce((sum, i) => sum + i.qty, 0)})</h3>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="btn-text-danger btn-sm">
                  Clear
                </button>
              )}
            </div>

            {/* Patient Meta Form */}
            <div className="pos-patient-fields">
              <input
                type="text"
                placeholder="Patient Name (e.g. John Smith)"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="pos-patient-input"
              />
              <input
                type="text"
                placeholder="Doctor Ref (e.g. Dr. Rao)"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="pos-patient-input"
              />
            </div>

            {/* Cart Items List */}
            <div className="pos-cart-items-list">
              {cart.length === 0 ? (
                <div className="pos-cart-empty">
                  <Receipt size={36} color="#cbd5e1" />
                  <p>Cart is currently empty. Add medicines from search list.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicine._id} className="pos-cart-item-row">
                    <div className="pos-cart-item-meta">
                      <strong className="text-sm">{item.medicine.name}</strong>
                      <span className="text-xs text-slate-500 font-mono">
                        ₹{(Number(item.medicine.price) || 0).toFixed(2)} each
                      </span>
                    </div>

                    <div className="pos-cart-item-controls">
                      <div className="stock-control-cell">
                        <button
                          onClick={() => handleUpdateQty(item.medicine._id, -1)}
                          className="btn-stock-adjust minus"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="stock-badge badge-green font-bold">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.medicine._id, 1)}
                          className="btn-stock-adjust plus"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <span className="font-semibold text-sm w-16 text-right">
                        ₹{(item.qty * (Number(item.medicine.price) || 0)).toFixed(2)}
                      </span>

                      <button
                        onClick={() => handleRemoveItem(item.medicine._id)}
                        className="btn-icon-action delete"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Billing Summary */}
            <div className="pos-summary-section">
              <div className="pos-summary-line">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="pos-summary-line">
                <span>GST Tax (5%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="pos-summary-line grand-total">
                <span>Grand Total:</span>
                <span className="text-blue-600">{formatCurrency(grandTotal)}</span>
              </div>

              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || isProcessing}
                className="btn-primary pos-checkout-btn"
              >
                {isProcessing ? 'Recording Sale...' : `Complete Sale (${formatCurrency(grandTotal)})`}
              </button>
            </div>

          </div>

          {/* Last Invoice Receipt Quick Action */}
          {lastInvoice && (
            <div className="last-invoice-card">
              <div className="flex-align-gap">
                <CheckCircle2 size={18} color="#16a34a" />
                <div>
                  <strong>{lastInvoice.invoiceNumber} Created</strong>
                  <div className="text-xs text-slate-500">Paid: {formatCurrency(lastInvoice.grandTotal)}</div>
                </div>
              </div>
              <button onClick={handlePrintInvoice} className="btn-secondary btn-sm">
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default BillingModule;
