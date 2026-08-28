import React from 'react';
import {
  CheckCircle2,
  Package,
  PlusCircle,
  RefreshCw,
  Ban,
  ArrowRight,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const ImportSummaryModal = ({
  isOpen,
  importResult,
  onGoToInventory,
  onScanAnother,
}) => {
  if (!isOpen || !importResult) return null;

  const {
    importedCount = 0,
    updatedCount = 0,
    skippedCount = 0,
    errors = [],
    message = 'Medicines successfully processed and added to inventory.',
  } = importResult;

  const totalProcessed = importedCount + updatedCount;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content import-summary-dialog" onClick={(e) => e.stopPropagation()}>
        
        <div className="summary-success-icon-wrap">
          <CheckCircle2 size={36} />
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Inventory Import Complete!
        </h3>
        
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
          {message}
        </p>

        {/* Breakdown Stats Grid */}
        <div className="summary-stats-grid">
          
          <div className="summary-stat-box green">
            <span className="summary-stat-num">{importedCount}</span>
            <span className="summary-stat-label">Added as New</span>
          </div>

          <div className="summary-stat-box blue">
            <span className="summary-stat-num">{updatedCount}</span>
            <span className="summary-stat-label">Stock Updated</span>
          </div>

          <div className="summary-stat-box amber">
            <span className="summary-stat-num">{skippedCount}</span>
            <span className="summary-stat-label">Skipped</span>
          </div>

        </div>

        {/* Error notice if any */}
        {errors && errors.length > 0 && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            textAlign: 'left',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: '#991b1b'
          }}>
            <div className="flex-align-gap" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              <AlertCircle size={14} /> {errors.length} Item(s) had validation errors:
            </div>
            <ul style={{ paddingLeft: '1.25rem' }}>
              {errors.map((err, idx) => (
                <li key={idx}><strong>{err.item}:</strong> {err.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions" style={{ justifyContent: 'center', marginTop: '1.5rem', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onScanAnother}
            className="btn-secondary"
          >
            <RotateCcw size={15} /> Scan Another Bill
          </button>

          <button
            type="button"
            onClick={onGoToInventory}
            className="btn-primary flex-align-gap"
          >
            <Package size={16} />
            <span>Go to Stock Inventory</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportSummaryModal;
