import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Layers,
  DollarSign,
  Download,
  Database,
  Lock,
  Mail,
  Smartphone,
  Network,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { exportMedicinesToCSV } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';

const SettingsModule = ({ medicines = [] }) => {
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
    ? `mediaalert_settings_${currentUser._id}`
    : 'mediaalert_settings';

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved
        ? JSON.parse(saved)
        : {
            expiryThresholdDays: 30,
            defaultMinStock: 10,
            currencySymbol: '₹',
            soundAlerts: true,
            compactMode: false,
          };
    } catch {
      return {
        expiryThresholdDays: 30,
        defaultMinStock: 10,
        currencySymbol: '₹',
        soundAlerts: true,
        compactMode: false,
      };
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(settings));
    showSuccess('Application preferences saved successfully.');
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(medicines, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MediaAlert_Backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Full database JSON backup created successfully.');
    } catch {
      showError('Failed to generate JSON backup.');
    }
  };

  return (
    <div className="settings-module-container">
      
      {/* Header */}
      <div className="module-header-row">
        <div>
          <h2>System Settings & Preferences</h2>
          <p>Configure operational alert thresholds, currency formats, data backup, and system integrations</p>
        </div>
      </div>

      <div className="settings-sections-list">
        
        {/* Section 1: Active Configuration */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Settings size={20} color="#2563eb" />
            <div>
              <h3>Inventory Alert Thresholds</h3>
              <p>Control when medicines trigger impending expiry and low-stock alerts</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label>Expiry Warning Horizon (Days)</label>
              <select
                value={settings.expiryThresholdDays}
                onChange={(e) => setSettings({ ...settings, expiryThresholdDays: Number(e.target.value) })}
                className="filter-dropdown"
              >
                <option value={15}>15 Days (Short Window)</option>
                <option value={30}>30 Days (Standard Pharmacy Policy)</option>
                <option value={60}>60 Days (Extended Horizon)</option>
                <option value={90}>90 Days (Early Distributor Return)</option>
              </select>
              <span className="text-xs text-slate-500 mt-1">
                Medicines expiring within this window will be flagged as "Expiring Soon".
              </span>
            </div>

            <div className="form-group">
              <label>Default Min Stock Level (Units)</label>
              <input
                type="number"
                min="1"
                value={settings.defaultMinStock}
                onChange={(e) => setSettings({ ...settings, defaultMinStock: Number(e.target.value) })}
              />
              <span className="text-xs text-slate-500 mt-1">
                Used as default replenishment threshold for newly added medicines.
              </span>
            </div>

            <div className="form-group">
              <label>Currency Symbol</label>
              <select
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="filter-dropdown"
              >
                <option value="₹">₹ (Indian Rupee - INR)</option>
                <option value="$">$ (US Dollar - USD)</option>
                <option value="€">€ (Euro - EUR)</option>
                <option value="£">£ (British Pound - GBP)</option>
                <option value="AED ">AED (Emirati Dirham)</option>
              </select>
            </div>

            <div className="form-actions" style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn-primary">
                <Save size={15} /> Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Data Backup & Export */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Database size={20} color="#10b981" />
            <div>
              <h3>Data Export & Local Backup</h3>
              <p>Download full structured copies of your pharmacy records for audits and cold storage</p>
            </div>
          </div>

          <div className="backup-actions-grid">
            <div className="backup-item">
              <div>
                <strong>JSON Database Snapshot</strong>
                <p className="text-xs text-slate-500">Full raw data dump compatible with MongoDB import</p>
              </div>
              <button onClick={handleExportJSON} className="btn-secondary btn-sm">
                <Download size={14} /> Download JSON ({medicines.length} records)
              </button>
            </div>

            <div className="backup-item">
              <div>
                <strong>Excel-Ready CSV Export</strong>
                <p className="text-xs text-slate-500">Formatted spreadsheet containing all batches, pricing, and statuses</p>
              </div>
              <button
                onClick={() => exportMedicinesToCSV(medicines, 'MediaAlert_Full_Backup.csv')}
                className="btn-secondary btn-sm"
              >
                <Download size={14} /> Download CSV
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Future Enterprise Integrations (Correctly marked BACKEND REQUIRED) */}
        <div className="settings-card border-slate-300 bg-slate-50">
          <div className="settings-card-header">
            <Network size={20} color="#64748b" />
            <div>
              <div className="flex-align-gap">
                <h3>Enterprise Integrations Roadmap</h3>
                <span className="backend-required-tag">BACKEND REQUIRED</span>
              </div>
              <p>Planned cloud integrations requiring server-side service credentials and database schema extensions</p>
            </div>
          </div>

          <div className="roadmap-items-list">
            
            <div className="roadmap-item">
              <div className="flex-align-gap">
                <Mail size={16} className="text-slate-500" />
                <div>
                  <strong>Automated Email Alert Dispatch to Suppliers</strong>
                  <p className="text-xs text-slate-500">
                    Will auto-email weekly expiry return lists and stockout purchase orders to registered distributors.
                  </p>
                </div>
              </div>
              <span className="roadmap-status-pill">Requires SMTP &amp; Cron Setup</span>
            </div>

            <div className="roadmap-item">
              <div className="flex-align-gap">
                <Smartphone size={16} className="text-slate-500" />
                <div>
                  <strong>SMS / WhatsApp Expiry Warnings to Pharmacy Staff</strong>
                  <p className="text-xs text-slate-500">
                    Direct instant notifications when a batch hits 7-day critical expiry window.
                  </p>
                </div>
              </div>
              <span className="roadmap-status-pill">Requires Twilio / Meta API</span>
            </div>

            <div className="roadmap-item">
              <div className="flex-align-gap">
                <Network size={16} className="text-slate-500" />
                <div>
                  <strong>Multi-Branch Inventory Synchronization</strong>
                  <p className="text-xs text-slate-500">
                    Centralized stock pooling and inter-branch medicine transfer requisitions.
                  </p>
                </div>
              </div>
              <span className="roadmap-status-pill">Requires Multi-tenant Database</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default SettingsModule;
