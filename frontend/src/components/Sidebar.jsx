import React from 'react';
import {
  Package,
  BarChart2,
  Settings,
  Activity,
  Receipt,
  Truck,
  Bell,
  User,
  X,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { getDaysUntilExpiry } from '../utils/medicineUtils';

const Sidebar = ({
  activeTab,
  setActiveTab,
  medicines = [],
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Count urgent issues for badge counters
  const expiredCount = medicines.filter((m) => getDaysUntilExpiry(m.expiryDate) < 0).length;
  const expiringSoonCount = medicines.filter((m) => {
    const days = getDaysUntilExpiry(m.expiryDate);
    return days >= 0 && days <= 30;
  }).length;
  const lowStockCount = medicines.filter((m) => {
    const qty = Number(m.quantity) || 0;
    const min = Number(m.minimumStock) || 10;
    return qty <= min;
  }).length;

  const totalUrgentAlerts = expiredCount + expiringSoonCount + lowStockCount;

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <Activity size={22} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">MediaAlert</span>
            <span className="brand-tagline">Pharmacy Care OS</span>
          </div>

          {/* Close button on mobile view */}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="btn-close-mobile-sidebar"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="sidebar-section-title">CORE INVENTORY</div>
        <ul className="sidebar-menu">
          <li
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => handleTabClick('inventory')}
            role="button"
            tabIndex={0}
          >
            <Package size={18} />
            <span>Stock Inventory</span>
            {medicines.length > 0 && (
              <span className="menu-pill-count">{medicines.length}</span>
            )}
          </li>

          <li
            className={activeTab === 'billing' ? 'active' : ''}
            onClick={() => handleTabClick('billing')}
            role="button"
            tabIndex={0}
          >
            <Receipt size={18} />
            <span>POS & Dispense</span>
          </li>

          <li
            className={activeTab === 'invoices' ? 'active' : ''}
            onClick={() => handleTabClick('invoices')}
            role="button"
            tabIndex={0}
          >
            <FileSpreadsheet size={18} />
            <span>Bill PDF Scanner</span>
            <span className="sidebar-ai-pill">AI</span>
          </li>

          <li
            className={activeTab === 'suppliers' ? 'active' : ''}
            onClick={() => handleTabClick('suppliers')}
            role="button"
            tabIndex={0}
          >
            <Truck size={18} />
            <span>Suppliers</span>
          </li>
        </ul>

        <div className="sidebar-section-title">INTELLIGENCE & AUDIT</div>
        <ul className="sidebar-menu">
          <li
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => handleTabClick('reports')}
            role="button"
            tabIndex={0}
          >
            <BarChart2 size={18} />
            <span>Reports & Analytics</span>
          </li>

          <li
            className={activeTab === 'notifications' ? 'active' : ''}
            onClick={() => handleTabClick('notifications')}
            role="button"
            tabIndex={0}
          >
            <Bell size={18} />
            <span>Alert Center</span>
            {totalUrgentAlerts > 0 && (
              <span className={`menu-alert-pill ${expiredCount > 0 ? 'alert-pill-red' : 'alert-pill-yellow'}`}>
                {totalUrgentAlerts}
              </span>
            )}
          </li>
        </ul>

        {/* Bottom Profile & Settings */}
        <div className="sidebar-footer">
          <div className="sidebar-section-title">CONFIGURATION</div>
          <ul className="sidebar-menu">
            <li
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => handleTabClick('profile')}
              role="button"
              tabIndex={0}
            >
              <User size={18} />
              <span>Shop Profile</span>
            </li>

            <li
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => handleTabClick('settings')}
              role="button"
              tabIndex={0}
            >
              <Settings size={18} />
              <span>System Settings</span>
            </li>
          </ul>

          <div className="sidebar-version-badge">
            <Sparkles size={12} color="#3b82f6" /> MediaAlert v2.4 Enterprise
          </div>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;