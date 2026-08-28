import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Building2,
  FileBadge,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const DEFAULT_PROFILE = {
  shopName: 'City Care Pharmacy & Medicals',
  pharmacistName: 'Dr. John Doe, Pharm.D',
  licenseNumber: '20B/21B-MH-49201',
  regNumber: 'PCI-REG-849204',
  email: 'admin@medicalshop.com',
  phone: '+91 98200 12345',
  emergencyPhone: '+91 98200 99999',
  gstin: '27AABCM8291Q1Z4',
  address: 'Shop 14, Sunrise Commercial Complex, MG Road, Mumbai, MH - 400001',
  operatingHours: '08:00 AM - 11:00 PM (All 7 Days)',
};

const ProfileModule = () => {
  const { showSuccess } = useToast();

  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const storageKey = currentUser?._id
    ? `mediaalert_profile_${currentUser._id}`
    : 'mediaalert_profile';

  const defaultUserProfile = {
    ...DEFAULT_PROFILE,
    pharmacistName: currentUser?.name || DEFAULT_PROFILE.pharmacistName,
    email: currentUser?.email || DEFAULT_PROFILE.email,
  };

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultUserProfile;
    } catch {
      return defaultUserProfile;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleSave = (e) => {
    e.preventDefault();
    setProfile(formData);
    localStorage.setItem(storageKey, JSON.stringify(formData));
    setIsEditing(false);
    showSuccess('Pharmacy profile and credentials updated successfully.');
  };

  return (
    <div className="profile-module-container">
      
      {/* Header */}
      <div className="module-header-row">
        <div>
          <h2>Pharmacy Credentials & License Profile</h2>
          <p>Registered establishment details, drug authority licenses, and operating compliance information</p>
        </div>

        <div>
          {isEditing ? (
            <button onClick={() => setIsEditing(false)} className="btn-secondary">
              Cancel
            </button>
          ) : (
            <button onClick={() => { setFormData(profile); setIsEditing(true); }} className="btn-primary">
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="profile-layout-grid">
        
        {/* Left: Summary Card */}
        <div className="profile-summary-card">
          <div className="profile-avatar-large">
            <User size={48} color="#2563eb" />
          </div>

          <h3 className="profile-card-shop">{profile.shopName}</h3>
          <span className="profile-card-pharmacist">{profile.pharmacistName}</span>

          <div className="compliance-badge">
            <ShieldCheck size={16} color="#16a34a" />
            <span>FDA & Drug Control Verified</span>
          </div>

          <div className="profile-quick-stats">
            <div className="profile-stat-box">
              <span className="stat-label">DL Number</span>
              <span className="stat-value font-mono">{profile.licenseNumber}</span>
            </div>
            <div className="profile-stat-box">
              <span className="stat-label">Pharmacist Reg</span>
              <span className="stat-value font-mono">{profile.regNumber}</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Information or Form */}
        <div className="profile-details-card">
          {isEditing ? (
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Pharmacy / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Head Pharmacist Name *</label>
                <input
                  type="text"
                  required
                  value={formData.pharmacistName}
                  onChange={(e) => setFormData({ ...formData, pharmacistName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Drug License (DL 20B/21B) *</label>
                <input
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Pharmacy Council Reg. No *</label>
                <input
                  type="text"
                  required
                  value={formData.regNumber}
                  onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>GSTIN Tax Identification</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Operating Hours</label>
                <input
                  type="text"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <Save size={15} /> Save Credentials
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-view-grid">
              
              <div className="profile-info-block">
                <span className="block-label"><Building2 size={14} /> Establishment</span>
                <span className="block-value font-semibold">{profile.shopName}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><User size={14} /> Licensed Chemist</span>
                <span className="block-value">{profile.pharmacistName}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><FileBadge size={14} /> Drug License No.</span>
                <span className="block-value font-mono text-blue-600">{profile.licenseNumber}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><FileBadge size={14} /> Pharmacy Council Reg.</span>
                <span className="block-value font-mono text-blue-600">{profile.regNumber}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><Mail size={14} /> Email Address</span>
                <span className="block-value">{profile.email}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><Phone size={14} /> Primary Phone</span>
                <span className="block-value">{profile.phone}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><Building2 size={14} /> GSTIN Tax No.</span>
                <span className="block-value font-mono">{profile.gstin}</span>
              </div>

              <div className="profile-info-block">
                <span className="block-label"><Building2 size={14} /> Operating Hours</span>
                <span className="block-value">{profile.operatingHours}</span>
              </div>

              <div className="profile-info-block full-span">
                <span className="block-label"><MapPin size={14} /> Registered Address</span>
                <span className="block-value">{profile.address}</span>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default ProfileModule;
