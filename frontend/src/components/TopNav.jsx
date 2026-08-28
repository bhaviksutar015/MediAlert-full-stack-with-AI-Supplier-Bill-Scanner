import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { getDaysUntilExpiry } from '../utils/medicineUtils';

const TopNav = ({
  onToggleMobileMenu,
  onOpenAddModal,
  medicines = [],
  onNavigateTab,
  onLogoutClick,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute urgent alerts count
  const urgentCount = medicines.filter((m) => {
    const days = getDaysUntilExpiry(m.expiryDate);
    const qty = Number(m.quantity) || 0;
    const min = Number(m.minimumStock) || 10;
    return days <= 30 || qty <= min;
  }).length;

  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const userName = currentUser?.name || 'Pharmacist Chemist';
  const userEmail = currentUser?.email || 'chemist@medicalshop.com';

  return (
    <nav className="top-nav">
      
      {/* Left side: Hamburger & Title */}
      <div className="top-nav-left">
        <button
          onClick={onToggleMobileMenu}
          className="btn-hamburger"
          aria-label="Open mobile menu"
        >
          <Menu size={20} />
        </button>

        <div className="top-nav-brand-title">
          <h2>Medical Shop Management</h2>
          <span className="live-status-pill">
            <span className="live-dot" /> Live Inventory
          </span>
        </div>
      </div>

      {/* Right side: Global Actions & User Profile */}
      <div className="top-nav-right">
        
        {/* Scan Supplier Bill Button */}
        <button
          onClick={() => onNavigateTab('invoices')}
          className="btn-secondary btn-sm top-nav-add-btn"
          title="Upload and scan supplier medicine invoice PDF"
        >
          <FileSpreadsheet size={15} color="#2563eb" /> <span className="hide-mobile">Scan Bill PDF</span>
        </button>

        {/* Quick Add Button */}
        <button
          onClick={onOpenAddModal}
          className="btn-primary btn-sm top-nav-add-btn"
          title="Add new medicine or scan box"
        >
          <Plus size={16} /> <span className="hide-mobile">Add Medicine</span>
        </button>

        {/* Alerts Bell */}
        <button
          onClick={() => onNavigateTab('notifications')}
          className="btn-icon-top-nav"
          title="View Alert Center"
          aria-label="Alerts"
        >
          <Bell size={19} />
          {urgentCount > 0 && (
            <span className="top-nav-alert-bubble">
              {urgentCount > 99 ? '99+' : urgentCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="top-nav-profile-wrapper" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="top-nav-profile-btn"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <div className="avatar-circle">
              <User size={16} color="#2563eb" />
            </div>
            <div className="profile-info-text hide-mobile">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">Licensed Chemist</span>
            </div>
            <ChevronDown size={14} className="profile-chevron hide-mobile" />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <div className="profile-badge-pill">
                  <ShieldCheck size={13} /> Verified Pharmacy
                </div>
                <strong>{userName}</strong>
                <span className="text-xs text-slate-500">{userEmail}</span>
              </div>

              <div className="profile-dropdown-divider" />

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigateTab('profile');
                }}
                className="profile-dropdown-item"
              >
                <User size={15} /> My Profile & License
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigateTab('settings');
                }}
                className="profile-dropdown-item"
              >
                <ShieldCheck size={15} /> System Preferences
              </button>

              <div className="profile-dropdown-divider" />

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onLogoutClick();
                }}
                className="profile-dropdown-item text-red-600"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>

    </nav>
  );
};

export default TopNav;