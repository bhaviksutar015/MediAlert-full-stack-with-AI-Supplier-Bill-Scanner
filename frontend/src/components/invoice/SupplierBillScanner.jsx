import React, { useState } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import InvoiceUpload from './InvoiceUpload';
import ExtractedMedicineTable from './ExtractedMedicineTable';
import DuplicateResolutionModal from './DuplicateResolutionModal';
import ImportSummaryModal from './ImportSummaryModal';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../config/api';
import './invoiceStyles.css';

const SupplierBillScanner = ({ onRefreshInventory, onNavigateTab }) => {
  const { showSuccess, showError, showWarning } = useToast();

  // Workflow Phases: 'upload' | 'review'
  const [phase, setPhase] = useState('upload');
  const [isScanning, setIsScanning] = useState(false);
  const [progressStatus, setProgressStatus] = useState(null);

  // Scanned Data State
  const [scannedFile, setScannedFile] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    supplierName: '',
    invoiceNumber: '',
    invoiceDate: '',
    totalInvoiceAmount: null,
  });
  const [medicines, setMedicines] = useState([]);
  const [failedPages, setFailedPages] = useState([]);

  // Duplicate Check & Import State
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // --- 1. HANDLE PDF UPLOAD & SCAN ---
  const handleFileSelected = async (file) => {
    setScannedFile(file);
    setIsScanning(true);
    setProgressStatus({ message: 'Uploading and parsing PDF document...' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/invoices/scan`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      if (data.success) {
        setInvoiceData(data.invoice || {
          supplierName: '',
          invoiceNumber: '',
          invoiceDate: '',
          totalInvoiceAmount: null,
        });
        setMedicines(data.medicines || []);
        setFailedPages(data.failedPages || []);
        setPhase('review');
        showSuccess(data.message || `Successfully extracted ${data.totalExtracted || 0} medicines from invoice.`);
      }
    } catch (err) {
      console.error('Invoice scanning error:', err);
      const msg = err.response?.data?.message || 'Failed to scan and extract invoice. Please check file format.';
      showError(msg);
    } finally {
      setIsScanning(false);
      setProgressStatus(null);
    }
  };

  // --- 2. HANDLE INVOICE METADATA & MEDICINES UPDATE ---
  const handleUpdateInvoiceData = (field, value) => {
    setInvoiceData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateMedicines = (updatedList) => {
    setMedicines(updatedList);
  };

  // --- 3. CHECK DUPLICATES & PREPARE IMPORT ---
  const handleProceedToImport = async () => {
    const selectedMedicines = medicines.filter((m) => m.selected);
    if (selectedMedicines.length === 0) {
      showWarning('Please select at least one medicine to import.');
      return;
    }

    setIsCheckingDuplicates(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/invoices/check-duplicates`,
        { medicines: selectedMedicines },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const foundDuplicates = response.data.duplicates || [];

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        setIsDuplicateModalOpen(true);
      } else {
        // No duplicates found, import directly
        await executeImport(selectedMedicines, {});
      }
    } catch (err) {
      console.error('Duplicate check error:', err);
      showError(err.response?.data?.message || 'Failed to check inventory duplicates.');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // --- 4. EXECUTE BATCH IMPORT ---
  const executeImport = async (medicinesToImport, resolutions = {}) => {
    setIsImporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/invoices/import`,
        {
          medicines: medicinesToImport,
          duplicateResolutions: resolutions,
          invoiceMetadata: invoiceData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data;
      setImportResult(result);
      setIsDuplicateModalOpen(false);
      setIsSummaryModalOpen(true);

      // Refresh parent inventory in real-time
      if (onRefreshInventory) {
        onRefreshInventory();
      }

      showSuccess(`Import complete: ${result.importedCount || 0} new items added, ${result.updatedCount || 0} updated.`);
    } catch (err) {
      console.error('Import medicines error:', err);
      showError(err.response?.data?.message || 'Failed to import medicines into inventory.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmDuplicateResolutions = (resolutions) => {
    const selectedMedicines = medicines.filter((m) => m.selected);
    executeImport(selectedMedicines, resolutions);
  };

  // --- 5. RESET / SCAN ANOTHER INVOICE ---
  const handleResetScan = () => {
    setScannedFile(null);
    setInvoiceData({
      supplierName: '',
      invoiceNumber: '',
      invoiceDate: '',
      totalInvoiceAmount: null,
    });
    setMedicines([]);
    setFailedPages([]);
    setDuplicates([]);
    setIsDuplicateModalOpen(false);
    setIsSummaryModalOpen(false);
    setImportResult(null);
    setPhase('upload');
  };

  return (
    <div className="invoice-scanner-container">
      
      {/* Top Header & Workflow Progress Stepper */}
      <div className="invoice-scanner-header">
        
        <div className="invoice-header-title-wrap">
          <h2>
            <FileSpreadsheet size={24} className="text-blue-600" />
            <span>AI Supplier Bill Scanner & Bulk Inventory Import</span>
          </h2>
          <p>
            Upload supplier invoices in PDF format to automatically extract, review, and import multiple medicines into your inventory.
          </p>
        </div>

        <div className="invoice-stepper">
          <div className={`step-item ${phase === 'upload' ? 'active' : 'completed'}`}>
            <span className="step-number">1</span>
            <span>Upload PDF</span>
          </div>
          
          <div className="step-divider" />

          <div className={`step-item ${phase === 'review' ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span>Review & Edit</span>
          </div>

          <div className="step-divider" />

          <div className="step-item">
            <span className="step-number">3</span>
            <span>Import to Inventory</span>
          </div>
        </div>

      </div>

      {/* Dynamic Content by Phase */}
      {phase === 'upload' && (
        <InvoiceUpload
          isScanning={isScanning}
          progressStatus={progressStatus}
          onFileSelected={handleFileSelected}
        />
      )}

      {phase === 'review' && (
        <ExtractedMedicineTable
          invoiceData={invoiceData}
          medicines={medicines}
          failedPages={failedPages}
          onUpdateMedicines={handleUpdateMedicines}
          onUpdateInvoiceData={handleUpdateInvoiceData}
          onProceedToImport={handleProceedToImport}
          onResetScan={handleResetScan}
          isCheckingDuplicates={isCheckingDuplicates}
        />
      )}

      {/* Duplicate Resolution Modal */}
      <DuplicateResolutionModal
        isOpen={isDuplicateModalOpen}
        duplicates={duplicates}
        onConfirmImport={handleConfirmDuplicateResolutions}
        onCancel={() => setIsDuplicateModalOpen(false)}
        isImporting={isImporting}
      />

      {/* Post-Import Summary Confirmation Modal */}
      <ImportSummaryModal
        isOpen={isSummaryModalOpen}
        importResult={importResult}
        onGoToInventory={() => {
          setIsSummaryModalOpen(false);
          if (onNavigateTab) onNavigateTab('inventory');
        }}
        onScanAnother={handleResetScan}
      />

    </div>
  );
};

export default SupplierBillScanner;
