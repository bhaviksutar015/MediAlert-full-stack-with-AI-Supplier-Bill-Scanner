import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  PackageCheck,
  ChevronRight,
  Download,
  Trash2,
  Plus
} from 'lucide-react';
import {
  getDaysUntilExpiry,
  formatDate,
  formatCurrency,
  getExpiryBadgeInfo
} from '../../utils/medicineUtils';
import { exportMedicinesToCSV } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';

const AlertsModule = ({
  medicines = [],
  onNavigateToMedicine,
  onOpenEdit,
  onOpenDelete,
}) => {
  const { showSuccess, showError } = useToast();

  const expiredMedicines = medicines.filter((m) => getDaysUntilExpiry(m.expiryDate) < 0);
  const expiringSoonMedicines = medicines.filter((m) => {
    const days = getDaysUntilExpiry(m.expiryDate);
    return days >= 0 && days <= 30;
  });
  const lowStockMedicines = medicines.filter((m) => {
    const qty = Number(m.quantity) || 0;
    const min = Number(m.minimumStock) || 10;
    return qty <= min;
  });

  const totalAlerts = expiredMedicines.length + expiringSoonMedicines.length + lowStockMedicines.length;

  const handleExportAlerts = () => {
    const alertList = [...expiredMedicines, ...expiringSoonMedicines, ...lowStockMedicines];
    if (alertList.length === 0) {
      showError('No active alerts to export.');
      return;
    }
    // Remove duplicates
    const unique = Array.from(new Set(alertList.map((a) => a._id))).map((id) =>
      alertList.find((a) => a._id === id)
    );
    exportMedicinesToCSV(unique, 'MediaAlert_Active_Alerts_Audit.csv');
    showSuccess('Alert report exported successfully.');
  };

  return (
    <div className="alerts-module-container">
      
      {/* Header */}
      <div className="module-header-row">
        <div>
          <h2>System Alerts & Quality Control Center</h2>
          <p>Real-time regulatory compliance alerts, expired stock warnings, and low-inventory restock triggers</p>
        </div>

        {totalAlerts > 0 && (
          <button onClick={handleExportAlerts} className="btn-secondary btn-icon-text">
            <Download size={15} /> Export Alerts CSV
          </button>
        )}
      </div>

      {/* Summary Status Bar */}
      <div className="alerts-summary-bar">
        <div className={`alert-stat-pill ${expiredMedicines.length > 0 ? 'red' : 'green'}`}>
          <AlertCircle size={16} />
          <span>{expiredMedicines.length} Expired Medicines</span>
        </div>

        <div className={`alert-stat-pill ${expiringSoonMedicines.length > 0 ? 'yellow' : 'green'}`}>
          <Clock size={16} />
          <span>{expiringSoonMedicines.length} Expiring in &lt; 30 Days</span>
        </div>

        <div className={`alert-stat-pill ${lowStockMedicines.length > 0 ? 'orange' : 'green'}`}>
          <AlertTriangle size={16} />
          <span>{lowStockMedicines.length} Low Stock SKUs</span>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="alerts-clean-state">
          <PackageCheck size={48} color="#16a34a" />
          <h3>All Systems Optimal!</h3>
          <p>No expired medicines, impending expiries, or low stock warnings detected in your current inventory.</p>
        </div>
      ) : (
        <div className="alert-sections-list">
          
          {/* Section 1: Expired Medicines (Critical) */}
          {expiredMedicines.length > 0 && (
            <div className="alert-section-card border-red">
              <div className="alert-section-header bg-red-header">
                <div className="flex-align-gap">
                  <AlertCircle size={20} color="#dc2626" />
                  <div>
                    <h3 className="text-red-900">Critical: Expired Inventory ({expiredMedicines.length})</h3>
                    <p className="text-red-700 text-xs">These medicines have passed their expiry date and must be removed from retail dispensing shelves.</p>
                  </div>
                </div>
              </div>

              <div className="alert-items-table">
                {expiredMedicines.map((med) => {
                  const days = Math.abs(getDaysUntilExpiry(med.expiryDate));
                  return (
                    <div key={med._id} className="alert-item-row">
                      <div className="alert-item-info">
                        <span className="font-semibold text-slate-900">{med.name}</span>
                        <div className="alert-item-meta">
                          <span className="font-mono text-xs">Batch: {med.batchNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>Category: {med.category || 'General'}</span>
                          <span>•</span>
                          <span>Stock: {med.quantity} Units</span>
                        </div>
                      </div>

                      <div className="alert-item-right">
                        <span className="alert-badge-danger">Expired {days} day{days === 1 ? '' : 's'} ago</span>
                        <div className="alert-item-actions">
                          <button
                            onClick={() => onOpenDelete(med)}
                            className="btn-text-danger"
                            title="Dispose and remove from system"
                          >
                            <Trash2 size={15} /> Write-off
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Expiring Soon (< 30 Days) */}
          {expiringSoonMedicines.length > 0 && (
            <div className="alert-section-card border-yellow">
              <div className="alert-section-header bg-yellow-header">
                <div className="flex-align-gap">
                  <Clock size={20} color="#d97706" />
                  <div>
                    <h3 className="text-amber-900">Action Required: Expiring in next 30 Days ({expiringSoonMedicines.length})</h3>
                    <p className="text-amber-700 text-xs">Eligible for distributor return or priority dispensing before expiry.</p>
                  </div>
                </div>
              </div>

              <div className="alert-items-table">
                {expiringSoonMedicines.map((med) => {
                  const days = getDaysUntilExpiry(med.expiryDate);
                  return (
                    <div key={med._id} className="alert-item-row">
                      <div className="alert-item-info">
                        <span className="font-semibold text-slate-900">{med.name}</span>
                        <div className="alert-item-meta">
                          <span className="font-mono text-xs">Batch: {med.batchNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>Expiry: {formatDate(med.expiryDate)}</span>
                          <span>•</span>
                          <span>Stock: {med.quantity} Units</span>
                        </div>
                      </div>

                      <div className="alert-item-right">
                        <span className="alert-badge-warning">Expires in {days} day{days === 1 ? '' : 's'}</span>
                        <div className="alert-item-actions">
                          <button
                            onClick={() => onOpenEdit(med)}
                            className="btn-secondary btn-sm"
                          >
                            Edit Batch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Low Stock Alerts */}
          {lowStockMedicines.length > 0 && (
            <div className="alert-section-card border-orange">
              <div className="alert-section-header bg-orange-header">
                <div className="flex-align-gap">
                  <AlertTriangle size={20} color="#ea580c" />
                  <div>
                    <h3 className="text-orange-900">Replenishment Alert: Low Stock ({lowStockMedicines.length})</h3>
                    <p className="text-orange-700 text-xs">Stock is below or equal to the minimum safety threshold.</p>
                  </div>
                </div>
              </div>

              <div className="alert-items-table">
                {lowStockMedicines.map((med) => {
                  const qty = Number(med.quantity) || 0;
                  return (
                    <div key={med._id} className="alert-item-row">
                      <div className="alert-item-info">
                        <span className="font-semibold text-slate-900">{med.name}</span>
                        <div className="alert-item-meta">
                          <span>Category: {med.category || 'General'}</span>
                          <span>•</span>
                          <span>Threshold: {med.minimumStock || 10} Units</span>
                        </div>
                      </div>

                      <div className="alert-item-right">
                        <span className={qty === 0 ? 'alert-badge-danger' : 'alert-badge-orange'}>
                          {qty === 0 ? 'Out of Stock (0 Units)' : `Only ${qty} Units Remaining`}
                        </span>
                        <div className="alert-item-actions">
                          <button
                            onClick={() => onOpenEdit(med)}
                            className="btn-secondary btn-sm"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default AlertsModule;
