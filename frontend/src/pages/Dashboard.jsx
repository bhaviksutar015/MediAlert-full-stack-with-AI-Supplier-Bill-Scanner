import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import KPICards from '../components/KPICards';
import FilterBar from '../components/FilterBar';
import InventoryTable from '../components/InventoryTable';
import MedicineModal from '../components/MedicineModal';
import MedicineDetailModal from '../components/MedicineDetailModal';
import Analytics from '../components/Analytics';
import AlertsModule from '../components/modules/AlertsModule';
import BillingModule from '../components/modules/BillingModule';
import SuppliersModule from '../components/modules/SuppliersModule';
import SupplierBillScanner from '../components/invoice/SupplierBillScanner';
import ProfileModule from '../components/modules/ProfileModule';
import SettingsModule from '../components/modules/SettingsModule';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { TableSkeleton, CardSkeleton } from '../components/common/SkeletonLoader';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  filterMedicinesList,
  sortMedicinesList,
  getDaysUntilExpiry
} from '../utils/medicineUtils';
import { exportMedicinesToCSV, printAuditReport } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  // --- STATE ---
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'expiryDate', direction: 'ascending' });

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailMedicine, setDetailMedicine] = useState(null);

  // Confirm Dialogs
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    medicine: null,
    isLoading: false,
  });
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // --- API DATA FETCHING ---
  const fetchInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError('');
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch with limit=500 to ensure complete dataset for local search, filter & analytics
      const response = await axios.get(`${API_BASE_URL}/api/medicines?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = response.data.data || response.data.medicines || response.data || [];
      setMedicines(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setMedicines([]);
        navigate('/login');
      } else {
        setFetchError(err.response?.data?.message || 'Failed to load medicines from server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // --- KEYBOARD SHORTCUTS (Ctrl+K, N, Esc) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is actively typing in an input/textarea/select
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      // Ctrl + K or / to focus search
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        setActiveTab('inventory');
        const searchInput = document.querySelector('.filter-search-input');
        if (searchInput) searchInput.focus();
      }

      // 'N' to open Add Medicine modal
      if (e.key.toLowerCase() === 'n' && !isInput && !isAddEditModalOpen && !isDetailModalOpen) {
        e.preventDefault();
        setEditingMedicine(null);
        setIsAddEditModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddEditModalOpen, isDetailModalOpen]);

  // --- ACTIONS & HANDLERS ---
  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedicine(med);
    setIsAddEditModalOpen(true);
  };

  const handleOpenDetailModal = (med) => {
    setDetailMedicine(med);
    setIsDetailModalOpen(true);
  };

  const handlePromptDelete = (med) => {
    setDeleteConfirm({
      isOpen: true,
      medicine: med,
      isLoading: false,
    });
  };

  const handleConfirmDelete = async () => {
    const med = deleteConfirm.medicine;
    if (!med) return;

    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/medicines/${med._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update state locally immediately
      setMedicines((prev) => prev.filter((item) => item._id !== med._id));
      showSuccess(`Deleted "${med.name}" from inventory.`);
      setDeleteConfirm({ isOpen: false, medicine: null, isLoading: false });
    } catch (err) {
      console.error('Delete error:', err);
      showError(err.response?.data?.message || 'Failed to delete medicine.');
      setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Quick Inline Stock Adjustment (+/- 1)
  const handleQuickAdjustStock = async (med, delta) => {
    const newQty = Math.max(0, (Number(med.quantity) || 0) + delta);
    
    // Optimistic local UI update
    setMedicines((prev) =>
      prev.map((item) => (item._id === med._id ? { ...item, quantity: newQty } : item))
    );

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/medicines/${med._id}`,
        { quantity: newQty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (delta > 0) {
        showSuccess(`Restocked "${med.name}" (+${delta}). Total: ${newQty} units.`);
      } else {
        showSuccess(`Dispensed "${med.name}" (-1). Remaining: ${newQty} units.`);
      }
    } catch (err) {
      console.error('Stock adjustment error:', err);
      showError('Failed to update stock on server.');
      fetchInventory(); // Rollback to server state
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setExpiryFilter('all');
    setStockFilter('all');
  };

  const handleKPISelectFilter = ({ expiry, stock }) => {
    setExpiryFilter(expiry);
    setStockFilter(stock);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMedicines([]);
    showSuccess('Signed out successfully.');
    navigate('/login');
  };

  // --- DERIVED CATEGORIES & FILTERED DATA ---
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    medicines.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return filterMedicinesList(medicines, {
      searchTerm,
      categoryFilter,
      expiryFilter,
      stockFilter,
    });
  }, [medicines, searchTerm, categoryFilter, expiryFilter, stockFilter]);

  const sortedAndFilteredMedicines = useMemo(() => {
    return sortMedicinesList(filteredMedicines, sortConfig);
  }, [filteredMedicines, sortConfig]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'all' ||
    expiryFilter !== 'all' ||
    stockFilter !== 'all';

  // Export handlers
  const handleExportCSV = () => {
    try {
      const dataToExport = sortedAndFilteredMedicines.length > 0 ? sortedAndFilteredMedicines : medicines;
      exportMedicinesToCSV(dataToExport, 'MediaAlert_Inventory_Stock.csv');
      showSuccess(`Exported ${dataToExport.length} medicine records to CSV.`);
    } catch (err) {
      showError(err.message || 'Export failed.');
    }
  };

  const handlePrintAudit = () => {
    const dataToPrint = sortedAndFilteredMedicines.length > 0 ? sortedAndFilteredMedicines : medicines;
    printAuditReport(dataToPrint, 'Pharmacy Stock & Expiry Audit Report');
  };

  return (
    <div className="dashboard-layout">
      
      {/* 1. SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        medicines={medicines}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="main-panel">
        
        {/* Top Navbar */}
        <TopNav
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenAddModal={handleOpenAddModal}
          medicines={medicines}
          onNavigateTab={setActiveTab}
          onLogoutClick={() => setIsLogoutConfirmOpen(true)}
        />

        {/* Dynamic Workspace Content */}
        <main className="dashboard-content">
          
          {fetchError && (
            <ErrorMessage
              title="Connection Error"
              message={fetchError}
              onRetry={fetchInventory}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 1: INVENTORY WORKSPACE                                */}
          {/* ========================================================= */}
          {activeTab === 'inventory' && (
            <div className="inventory-view-container">
              
              {/* Interactive KPI Summary Cards */}
              {isLoading ? (
                <CardSkeleton count={4} />
              ) : (
                <KPICards
                  medicines={medicines}
                  activeExpiryFilter={expiryFilter}
                  activeStockFilter={stockFilter}
                  onSelectFilter={handleKPISelectFilter}
                />
              )}

              {/* Filter, Search & Export Bar */}
              <FilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                expiryFilter={expiryFilter}
                onExpiryChange={setExpiryFilter}
                stockFilter={stockFilter}
                onStockChange={setStockFilter}
                categories={uniqueCategories}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
                onAddNew={handleOpenAddModal}
                onExportCSV={handleExportCSV}
                onPrintReport={handlePrintAudit}
                totalMatching={sortedAndFilteredMedicines.length}
              />

              {/* High-Performance Sortable Table */}
              {isLoading ? (
                <TableSkeleton rows={6} cols={6} />
              ) : (
                <InventoryTable
                  medicines={sortedAndFilteredMedicines}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onViewDetails={handleOpenDetailModal}
                  onEdit={handleOpenEditModal}
                  onDelete={handlePromptDelete}
                  onQuickAdjustStock={handleQuickAdjustStock}
                  onAddNew={handleOpenAddModal}
                  onClearFilters={handleResetFilters}
                  isFiltered={hasActiveFilters}
                />
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BILLING & POS MODULE                               */}
          {/* ========================================================= */}
          {activeTab === 'billing' && (
            <BillingModule
              medicines={medicines}
              onRefreshInventory={fetchInventory}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 3: SUPPLIERS MODULE                                   */}
          {/* ========================================================= */}
          {activeTab === 'suppliers' && (
            <SuppliersModule
              medicines={medicines}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 3.5: AI SUPPLIER BILL SCANNER & BULK IMPORT           */}
          {/* ========================================================= */}
          {activeTab === 'invoices' && (
            <SupplierBillScanner
              onRefreshInventory={fetchInventory}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 4: REPORTS & ANALYTICS MODULE                         */}
          {/* ========================================================= */}
          {activeTab === 'reports' && (
            <Analytics medicines={medicines} />
          )}

          {/* ========================================================= */}
          {/* TAB 5: ALERTS CENTER MODULE                               */}
          {/* ========================================================= */}
          {activeTab === 'notifications' && (
            <AlertsModule
              medicines={medicines}
              onNavigateToMedicine={(med) => {
                setActiveTab('inventory');
                setSearchTerm(med.name);
              }}
              onOpenEdit={handleOpenEditModal}
              onOpenDelete={handlePromptDelete}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 6: SHOP PROFILE MODULE                                */}
          {/* ========================================================= */}
          {activeTab === 'profile' && <ProfileModule />}

          {/* ========================================================= */}
          {/* TAB 7: SETTINGS MODULE                                    */}
          {/* ========================================================= */}
          {activeTab === 'settings' && <SettingsModule medicines={medicines} />}

        </main>
      </div>

      {/* ========================================================= */}
      {/* GLOBAL MODALS & CONFIRM DIALOGS                           */}
      {/* ========================================================= */}

      {/* Add / Edit Medicine Modal */}
      <MedicineModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingMedicine(null);
        }}
        editingMedicine={editingMedicine}
        onSaveSuccess={fetchInventory}
      />

      {/* Full Medicine Detail Modal */}
      <MedicineDetailModal
        isOpen={isDetailModalOpen}
        medicine={detailMedicine}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailMedicine(null);
        }}
        onEdit={(med) => {
          setIsDetailModalOpen(false);
          handleOpenEditModal(med);
        }}
        onDelete={(med) => {
          setIsDetailModalOpen(false);
          handlePromptDelete(med);
        }}
      />

      {/* Accessible Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Medicine from Inventory"
        message="Are you sure you want to permanently delete this medicine? This action cannot be reversed."
        itemName={deleteConfirm.medicine ? `${deleteConfirm.medicine.name} (Batch: ${deleteConfirm.medicine.batchNumber || 'N/A'})` : ''}
        confirmLabel="Permanently Delete"
        cancelLabel="Keep Item"
        isDestructive={true}
        isLoading={deleteConfirm.isLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, medicine: null, isLoading: false })}
      />

      {/* Accessible Logout Confirm Dialog */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Sign Out from MediaAlert"
        message="Are you sure you want to end your current session? You will need to sign in again to manage inventory."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        isDestructive={false}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />

    </div>
  );
};

export default Dashboard;