import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileImage,
  Calendar,
  Layers,
  Building2,
  DollarSign
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config/api';

const MedicineModal = ({
  isOpen,
  onClose,
  editingMedicine,
  onSaveSuccess,
}) => {
  const { showSuccess, showError, showWarning } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    batchNumber: '',
    category: '',
    manufacturer: '',
    quantity: '',
    minimumStock: '10',
    expiryDate: '',
    purchaseDate: '',
    price: '',
    description: '',
  });

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingMedicine) {
      // Format dates safely for input type="date"
      const formatInputDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        name: editingMedicine.name || '',
        genericName: editingMedicine.genericName || '',
        batchNumber: editingMedicine.batchNumber || '',
        category: editingMedicine.category || '',
        manufacturer: editingMedicine.manufacturer || '',
        quantity: editingMedicine.quantity !== undefined ? String(editingMedicine.quantity) : '',
        minimumStock: editingMedicine.minimumStock !== undefined ? String(editingMedicine.minimumStock) : '10',
        expiryDate: formatInputDate(editingMedicine.expiryDate),
        purchaseDate: formatInputDate(editingMedicine.purchaseDate),
        price: editingMedicine.price !== undefined ? String(editingMedicine.price) : '',
        description: editingMedicine.description || '',
      });
      setAiPreviewUrl(null);
      setAiSuccessMsg('');
    } else {
      // Reset form for fresh entry
      setFormData({
        name: '',
        genericName: '',
        batchNumber: '',
        category: '',
        manufacturer: '',
        quantity: '',
        minimumStock: '10',
        expiryDate: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        price: '',
        description: '',
      });
      setAiPreviewUrl(null);
      setAiSuccessMsg('');
    }
  }, [editingMedicine, isOpen]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting && !isLoadingAI) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isLoadingAI, onClose]);

  if (!isOpen) return null;

  const handleProcessImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }

    // Set preview URL
    const preview = URL.createObjectURL(file);
    setAiPreviewUrl(preview);
    setIsLoadingAI(true);
    setAiSuccessMsg('');

    const aiDataForm = new FormData();
    aiDataForm.append('image', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/extract`, aiDataForm);
      const extracted = response.data.data;

      if (extracted) {
        // Format expiry date if returned as string
        let formattedExp = extracted.expiryDate || '';
        if (formattedExp && !isNaN(new Date(formattedExp).getTime())) {
          formattedExp = new Date(formattedExp).toISOString().split('T')[0];
        }

        setFormData((prev) => ({
          ...prev,
          name: extracted.name || prev.name,
          batchNumber: extracted.batchNumber || prev.batchNumber,
          category: extracted.category || prev.category,
          expiryDate: formattedExp || prev.expiryDate,
        }));

        setAiSuccessMsg('Packaging scanned successfully! Verify fields below.');
        showSuccess('AI successfully extracted medicine information.');
      }
    } catch (err) {
      console.error('AI Extraction error:', err);
      showError(err.response?.data?.message || 'Could not auto-extract details. Please enter manually.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showWarning('Medicine name is required.');
      return;
    }
    if (!formData.expiryDate) {
      showWarning('Expiry date is required.');
      return;
    }
    if (formData.quantity === '' || Number(formData.quantity) < 0) {
      showWarning('Valid stock quantity is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        batchNumber: formData.batchNumber.trim(),
        category: formData.category.trim() || 'General',
        manufacturer: formData.manufacturer.trim(),
        quantity: Number(formData.quantity),
        minimumStock: Number(formData.minimumStock) || 10,
        expiryDate: new Date(formData.expiryDate).toISOString(),
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : new Date().toISOString(),
        price: formData.price !== '' ? Number(formData.price) : 0,
        description: formData.description.trim(),
      };

      if (editingMedicine) {
        await axios.put(`${API_BASE_URL}/api/medicines/${editingMedicine._id}`, payload, { headers });
        showSuccess(`Updated "${payload.name}" successfully.`);
      } else {
        await axios.post(`${API_BASE_URL}/api/medicines`, payload, { headers });
        showSuccess(`Added "${payload.name}" to inventory.`);
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Save medicine error:', err);
      showError(err.response?.data?.message || 'Failed to save medicine. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="modal-content medicine-modal-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h3>
            <p className="modal-subtitle">
              {editingMedicine
                ? 'Update batch specifications, pricing, and stock levels'
                : 'Enter medicine details manually or upload packaging photo for auto-fill'}
            </p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="btn-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* AI Scanner Dropzone (Phase 4 UX feature embedded) */}
        {!editingMedicine && (
          <div
            className={`ai-dropzone ${isDragOver ? 'drag-over' : ''} ${isLoadingAI ? 'scanning' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isLoadingAI && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={isLoadingAI}
            />

            {isLoadingAI ? (
              <div className="ai-scanning-state">
                <RefreshCw size={28} className="spin-icon text-blue-600" />
                <div className="ai-scanning-text">
                  <strong>AI Vision is analyzing medicine packaging...</strong>
                  <span>Extracting brand name, batch number & expiry date</span>
                </div>
              </div>
            ) : aiPreviewUrl ? (
              <div className="ai-preview-state">
                <img src={aiPreviewUrl} alt="Medicine Box Preview" className="ai-thumb-preview" />
                <div className="ai-preview-info">
                  <div className="ai-tag"><Sparkles size={13} /> AI Auto-Fill Active</div>
                  <span className="text-sm font-medium text-slate-700">Click or drop new photo to re-scan</span>
                </div>
              </div>
            ) : (
              <div className="ai-idle-state">
                <div className="ai-icon-bubble">
                  <UploadCloud size={24} color="#2563eb" />
                </div>
                <div className="ai-prompt-copy">
                  <strong>Drag & drop packaging photo or click to browse</strong>
                  <span>Auto-detects Name, Batch No, Category & Expiry Date using Gemini Vision</span>
                </div>
              </div>
            )}
          </div>
        )}

        {aiSuccessMsg && (
          <div className="ai-success-strip">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{aiSuccessMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="modal-form">
          
          <div className="form-group full-width">
            <label>Medicine / Brand Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol 500mg, Augmentin 625 Duo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Generic / Formula Name</label>
            <input
              type="text"
              placeholder="e.g. Amoxicillin & Clavulanate"
              value={formData.genericName}
              onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              list="category-suggestions"
              placeholder="e.g. Antibiotics, Analgesic, Syrup"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <datalist id="category-suggestions">
              <option value="Antibiotics" />
              <option value="Analgesics / Pain Relief" />
              <option value="Antipyretic / Fever" />
              <option value="Cardiovascular" />
              <option value="Antidiabetic" />
              <option value="Syrups & Suspensions" />
              <option value="Dermatological / Ointments" />
              <option value="Vitamins & Supplements" />
              <option value="Ophthalmic / Eye Drops" />
              <option value="Emergency Care" />
            </datalist>
          </div>

          <div className="form-group">
            <label>Batch Number</label>
            <input
              type="text"
              placeholder="e.g. B-89402X"
              value={formData.batchNumber}
              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Manufacturer / Brand</label>
            <input
              type="text"
              placeholder="e.g. Sun Pharma, Cipla, GSK"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Stock Quantity (Units) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              required
              placeholder="e.g. 50"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Min Stock Alert Level</label>
            <input
              type="number"
              min="0"
              placeholder="Default: 10"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Unit Selling Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 45.50"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="form-group full-width">
            <label>Usage / Storage Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Store below 25°C in dry place. Prescription required."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoadingAI}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingAI}
              className="btn-primary"
            >
              {isSubmitting ? 'Saving Medicine...' : editingMedicine ? 'Update Medicine' : 'Add to Inventory'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default MedicineModal;
