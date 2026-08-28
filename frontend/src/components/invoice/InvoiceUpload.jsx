import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const InvoiceUpload = ({ isScanning, progressStatus, onFileSelected }) => {
  const { showError } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleValidateAndProceed = (file) => {
    if (!file) return;

    // 1. Validate PDF extension or MIME type
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      showError('Invalid file format. Please upload a PDF document (.pdf).');
      return;
    }

    // 2. Validate empty file
    if (file.size === 0) {
      showError('The selected PDF file is empty (0 bytes).');
      return;
    }

    // 3. Validate size limit (25 MB)
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showError('File size exceeds the 25 MB limit. Please upload a smaller PDF.');
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isScanning) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isScanning) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleValidateAndProceed(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleValidateAndProceed(selectedFile);
    }
  };

  return (
    <div className="invoice-upload-card">
      
      {/* Dropzone Area */}
      <div
        className={`invoice-dropzone ${isDragOver ? 'drag-over' : ''} ${isScanning ? 'scanning' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isScanning && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload supplier invoice PDF"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={isScanning}
        />

        {isScanning ? (
          <div className="scanning-status-box">
            <div className="scanning-pulse-circle">
              <RefreshCw size={32} className="spin-icon text-blue-600" />
            </div>
            
            <div className="scanning-text-title">
              {progressStatus?.message || 'Scanning Supplier Invoice...'}
            </div>
            
            <div className="scanning-text-subtitle">
              Multi-page PDF parsing, OCR verification & Gemini AI structured extraction in progress
            </div>

            <div className="scanning-progress-bar">
              <div className="scanning-progress-fill" style={{ width: '85%' }} />
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Do not close or refresh this tab while scanning
            </span>
          </div>
        ) : (
          <>
            <div className="dropzone-icon-wrap">
              <UploadCloud size={34} />
            </div>

            <div className="dropzone-title">
              Drag & Drop Supplier Medicine Invoice (PDF)
            </div>

            <div className="dropzone-desc">
              Upload multi-page bills from pharmaceutical distributors. AI will automatically transcribe medicine tables, batch codes, expiry dates, rates & quantities.
            </div>

            <div className="dropzone-limits-pill">
              <FileText size={14} className="text-blue-600" /> Supports multi-page PDFs up to 25 MB
            </div>
          </>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="upload-features-grid">
        
        <div className="upload-feature-item">
          <Layers size={20} className="upload-feature-icon" />
          <div>
            <strong>Multi-Page Invoice Parsing</strong>
            <span>Processes 10, 50, 100+ medicine rows across all pages seamlessly</span>
          </div>
        </div>

        <div className="upload-feature-item">
          <Sparkles size={20} className="upload-feature-icon" />
          <div>
            <strong>Intelligent OCR & AI Vision</strong>
            <span>Extracts printed, scanned, and digital PDF invoices accurately</span>
          </div>
        </div>

        <div className="upload-feature-item">
          <ShieldCheck size={20} className="upload-feature-icon" />
          <div>
            <strong>Duplicate Safeguard</strong>
            <span>Detects matching batches in inventory and avoids overwriting</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default InvoiceUpload;
