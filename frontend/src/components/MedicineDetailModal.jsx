import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Layers,
  Building2,
  Tag,
  Clock,
  AlertTriangle,
  Pencil,
  Trash2,
  FileText,
  DollarSign
} from 'lucide-react';
import {
  formatDate,
  getDaysUntilExpiry,
  getExpiryBadgeInfo,
  getStockStatus,
  formatCurrency
} from '../utils/medicineUtils';

const MedicineDetailModal = ({
  medicine,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !medicine) return null;

  const days = getDaysUntilExpiry(medicine.expiryDate);
  const badgeInfo = getExpiryBadgeInfo(medicine.expiryDate);
  const stockInfo = getStockStatus(medicine.quantity, medicine.minimumStock);
  const unitPrice = Number(medicine.price) || 0;
  const totalValue = (Number(medicine.quantity) || 0) * unitPrice;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content medicine-detail-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="detail-modal-header">
          <div>
            <span className="detail-category-pill">{medicine.category || 'General'}</span>
            <h2 className="detail-med-name">{medicine.name}</h2>
            {medicine.genericName && (
              <span className="detail-generic-name">Formula: {medicine.genericName}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-close" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Expiry & Stock Status Banners */}
        <div className="detail-status-strip">
          <div
            className="detail-status-card"
            style={{
              backgroundColor: badgeInfo.bg,
              borderColor: badgeInfo.borderColor,
              color: badgeInfo.color,
            }}
          >
            <Clock size={16} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{badgeInfo.label}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Expires on: {formatDate(medicine.expiryDate)}
              </div>
            </div>
          </div>

          <div
            className="detail-status-card"
            style={{
              backgroundColor: stockInfo.bg,
              borderColor: stockInfo.color + '40',
              color: stockInfo.color,
            }}
          >
            <Layers size={16} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{stockInfo.label}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Min Threshold: {medicine.minimumStock || 10} Units
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="detail-grid">
          <div className="detail-cell">
            <span className="detail-cell-label"><Tag size={13} /> Batch Number</span>
            <span className="detail-cell-value font-mono">{medicine.batchNumber || 'N/A'}</span>
          </div>

          <div className="detail-cell">
            <span className="detail-cell-label"><Building2 size={13} /> Manufacturer</span>
            <span className="detail-cell-value">{medicine.manufacturer || 'Not Specified'}</span>
          </div>

          <div className="detail-cell">
            <span className="detail-cell-label"><DollarSign size={13} /> Unit Price</span>
            <span className="detail-cell-value">{unitPrice > 0 ? formatCurrency(unitPrice) : 'Free / Not set'}</span>
          </div>

          <div className="detail-cell">
            <span className="detail-cell-label"><DollarSign size={13} /> Total Inventory Value</span>
            <span className="detail-cell-value font-bold text-blue-600">{formatCurrency(totalValue)}</span>
          </div>

          <div className="detail-cell">
            <span className="detail-cell-label"><Calendar size={13} /> Purchase Date</span>
            <span className="detail-cell-value">{formatDate(medicine.purchaseDate) || 'Not Recorded'}</span>
          </div>

          <div className="detail-cell">
            <span className="detail-cell-label"><Calendar size={13} /> Registered In System</span>
            <span className="detail-cell-value">{formatDate(medicine.createdAt)}</span>
          </div>
        </div>

        {/* Description / Notes */}
        {medicine.description && (
          <div className="detail-notes-box">
            <span className="detail-cell-label"><FileText size={13} /> Usage / Storage Notes</span>
            <p className="detail-notes-text">{medicine.description}</p>
          </div>
        )}

        {/* Actions Footer */}
        <div className="detail-modal-footer">
          <button
            onClick={() => {
              onClose();
              onDelete(medicine);
            }}
            className="btn-danger-outline"
          >
            <Trash2 size={15} /> Delete Item
          </button>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(medicine);
              }}
              className="btn-primary"
            >
              <Pencil size={15} /> Edit Details
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MedicineDetailModal;
