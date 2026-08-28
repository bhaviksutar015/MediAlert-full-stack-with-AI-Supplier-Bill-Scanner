import React, { useState } from 'react';
import {
  AlertTriangle,
  Layers,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  CopyPlus,
  Ban,
  X
} from 'lucide-react';

const DuplicateResolutionModal = ({
  isOpen,
  duplicates = [],
  onConfirmImport,
  onCancel,
  isImporting,
}) => {
  // Map of tempId -> resolution choice ('add_quantity' | 'update' | 'create_new' | 'skip')
  const [resolutions, setResolutions] = useState(() => {
    const initial = {};
    duplicates.forEach((d) => {
      // Default to 'add_quantity' as recommended action
      initial[d.tempId] = 'add_quantity';
    });
    return initial;
  });

  if (!isOpen || duplicates.length === 0) return null;

  const handleSelectResolution = (tempId, choice) => {
    setResolutions((prev) => ({ ...prev, [tempId]: choice }));
  };

  const handleApplyBulk = (choice) => {
    const updated = {};
    duplicates.forEach((d) => {
      updated[d.tempId] = choice;
    });
    setResolutions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmImport(resolutions);
  };

  return (
    <div className="modal-overlay" onClick={isImporting ? undefined : onCancel} role="dialog" aria-modal="true">
      <div className="modal-content duplicate-modal-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3>Duplicate Inventory Detected ({duplicates.length})</h3>
            <p className="modal-subtitle">
              Some medicines from this invoice match existing records in your pharmacy stock. Choose how to handle each item.
            </p>
          </div>
          <button onClick={onCancel} disabled={isImporting} className="btn-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="duplicate-banner">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <div>
            <strong>Safeguard Policy:</strong> MediAlert will never overwrite existing stock without your explicit choice. You can add new stock to existing quantities, update pricing/expiry, create a separate batch, or skip.
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex-align-gap" style={{ marginBottom: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Quick Actions for All ({duplicates.length}) Duplicates:
          </span>
          <div className="flex-align-gap" style={{ gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleApplyBulk('add_quantity')}
              className="btn-secondary btn-sm"
            >
              Set All: Add Stock
            </button>
            <button
              type="button"
              onClick={() => handleApplyBulk('create_new')}
              className="btn-secondary btn-sm"
            >
              Set All: New Entry
            </button>
            <button
              type="button"
              onClick={() => handleApplyBulk('skip')}
              className="btn-secondary btn-sm"
            >
              Set All: Skip
            </button>
          </div>
        </div>

        {/* Duplicates List */}
        <form onSubmit={handleSubmit}>
          <div className="duplicate-items-list">
            {duplicates.map((dup) => {
              const currentChoice = resolutions[dup.tempId] || 'add_quantity';
              const existing = dup.existingMedicine || {};

              return (
                <div key={dup.tempId} className="duplicate-item-card">
                  
                  <div className="duplicate-card-header">
                    <div className="duplicate-med-title">
                      {dup.medicineName}
                    </div>
                    <span className={`match-type-pill ${dup.matchType}`}>
                      {dup.matchType === 'exact' ? 'Exact Name + Batch Match' : 'Name Match (Different Batch)'}
                    </span>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="duplicate-comparison-grid">
                    
                    {/* Existing Stock */}
                    <div className="comparison-col">
                      <strong>Current Inventory Record</strong>
                      <div className="comparison-detail-row">
                        <span>Batch:</span>
                        <span className="font-mono">{existing.batchNumber || 'N/A'}</span>
                      </div>
                      <div className="comparison-detail-row">
                        <span>Current Stock:</span>
                        <span className="font-semibold text-slate-800">{existing.quantity || 0} units</span>
                      </div>
                      <div className="comparison-detail-row">
                        <span>Price:</span>
                        <span>₹{existing.price || 0}</span>
                      </div>
                    </div>

                    {/* New Invoice Entry */}
                    <div className="comparison-col">
                      <strong>Incoming Invoice Entry</strong>
                      <div className="comparison-detail-row">
                        <span>Batch:</span>
                        <span className="font-mono">{dup.batchNumber || 'N/A'}</span>
                      </div>
                      <div className="comparison-detail-row">
                        <span>New Quantity:</span>
                        <span className="font-semibold text-blue-600">+{existing.quantity ? `(incoming)` : ''}</span>
                      </div>
                    </div>

                  </div>

                  {/* Resolution Choices */}
                  <div className="duplicate-resolution-choices">
                    
                    <label
                      className={`resolution-radio-label ${currentChoice === 'add_quantity' ? 'selected' : ''}`}
                      onClick={() => handleSelectResolution(dup.tempId, 'add_quantity')}
                    >
                      <PlusCircle size={15} />
                      <div>
                        <div>Add Quantity (Recommended)</div>
                        <span className="text-xs text-slate-500 font-normal">Increments existing stock count</span>
                      </div>
                    </label>

                    <label
                      className={`resolution-radio-label ${currentChoice === 'update' ? 'selected' : ''}`}
                      onClick={() => handleSelectResolution(dup.tempId, 'update')}
                    >
                      <RefreshCw size={15} />
                      <div>
                        <div>Update Record</div>
                        <span className="text-xs text-slate-500 font-normal">Updates price/expiry & adds quantity</span>
                      </div>
                    </label>

                    <label
                      className={`resolution-radio-label ${currentChoice === 'create_new' ? 'selected' : ''}`}
                      onClick={() => handleSelectResolution(dup.tempId, 'create_new')}
                    >
                      <CopyPlus size={15} />
                      <div>
                        <div>Create Separate</div>
                        <span className="text-xs text-slate-500 font-normal">Maintains as separate batch entry</span>
                      </div>
                    </label>

                    <label
                      className={`resolution-radio-label ${currentChoice === 'skip' ? 'selected' : ''}`}
                      onClick={() => handleSelectResolution(dup.tempId, 'skip')}
                    >
                      <Ban size={15} />
                      <div>
                        <div>Skip Item</div>
                        <span className="text-xs text-slate-500 font-normal">Do not import this duplicate</span>
                      </div>
                    </label>

                  </div>

                </div>
              );
            })}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={isImporting}
              className="btn-secondary"
            >
              Back to Review
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="btn-primary"
            >
              {isImporting ? 'Importing Medicines...' : 'Confirm Resolutions & Import'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default DuplicateResolutionModal;
