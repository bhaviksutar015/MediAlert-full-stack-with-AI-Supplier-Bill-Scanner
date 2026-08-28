import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Eye,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import {
  formatDate,
  getExpiryBadgeInfo,
  getStockStatus,
  formatCurrency
} from '../utils/medicineUtils';
import EmptyState from './common/EmptyState';

const InventoryTable = ({
  medicines = [],
  sortConfig,
  onSort,
  onViewDetails,
  onEdit,
  onDelete,
  onQuickAdjustStock,
  onAddNew,
  onClearFilters,
  isFiltered = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Pagination slicing
  const totalItems = medicines.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedMedicines = medicines.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderSortIcon = (key) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'ascending' ? (
        <ArrowUp size={14} className="sort-icon active" />
      ) : (
        <ArrowDown size={14} className="sort-icon active" />
      );
    }
    return <ArrowUpDown size={13} className="sort-icon inactive" />;
  };

  if (medicines.length === 0) {
    return (
      <div className="table-container">
        <EmptyState
          type={isFiltered ? 'no-filtered-results' : 'no-data'}
          onAction={isFiltered ? onClearFilters : onAddNew}
          actionLabel={isFiltered ? 'Clear All Filters' : 'Add First Medicine'}
        />
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-responsive-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th onClick={() => onSort('name')} className="sortable-th" style={{ width: '26%' }}>
                <div className="th-content">
                  <span>Medicine / Brand</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              <th onClick={() => onSort('batchNumber')} className="sortable-th" style={{ width: '13%' }}>
                <div className="th-content">
                  <span>Batch No.</span>
                  {renderSortIcon('batchNumber')}
                </div>
              </th>

              <th onClick={() => onSort('category')} className="sortable-th" style={{ width: '15%' }}>
                <div className="th-content">
                  <span>Category</span>
                  {renderSortIcon('category')}
                </div>
              </th>

              <th onClick={() => onSort('quantity')} className="sortable-th" style={{ width: '16%' }}>
                <div className="th-content">
                  <span>Stock Units</span>
                  {renderSortIcon('quantity')}
                </div>
              </th>

              <th onClick={() => onSort('expiryDate')} className="sortable-th" style={{ width: '18%' }}>
                <div className="th-content">
                  <span>Expiry Status</span>
                  {renderSortIcon('expiryDate')}
                </div>
              </th>

              <th style={{ width: '12%', textAlign: 'right' }}>
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedMedicines.map((med) => {
              const badgeInfo = getExpiryBadgeInfo(med.expiryDate);
              const stockInfo = getStockStatus(med.quantity, med.minimumStock);
              const isExpired = badgeInfo.status === 'expired';
              const isCritical = badgeInfo.status === 'critical' || badgeInfo.status === 'expiring-soon';

              let rowClass = '';
              if (isExpired) rowClass = 'row-expired';
              else if (isCritical) rowClass = 'row-expiring';

              return (
                <tr key={med._id} className={rowClass}>
                  
                  {/* Medicine Name & Generic info */}
                  <td>
                    <div className="med-name-cell">
                      <span className="font-semibold text-slate-900 med-title">{med.name}</span>
                      {med.genericName ? (
                        <span className="med-sub-formula">{med.genericName}</span>
                      ) : med.manufacturer ? (
                        <span className="med-sub-formula">{med.manufacturer}</span>
                      ) : null}
                    </div>
                  </td>

                  {/* Batch Number */}
                  <td>
                    <span className="batch-pill font-mono">{med.batchNumber || '—'}</span>
                  </td>

                  {/* Category */}
                  <td>
                    <span className="category-pill">{med.category || 'General'}</span>
                  </td>

                  {/* Stock Quantity with Quick Increment / Decrement */}
                  <td>
                    <div className="stock-control-cell">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdjustStock(med, -1);
                        }}
                        disabled={Number(med.quantity) <= 0}
                        className="btn-stock-adjust minus"
                        title="Sell / Decrease 1 Unit"
                        aria-label="Decrease stock"
                      >
                        <Minus size={12} />
                      </button>

                      <span className={`stock-badge ${stockInfo.badgeClass}`}>
                        {med.quantity}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdjustStock(med, 1);
                        }}
                        className="btn-stock-adjust plus"
                        title="Restock / Increase 1 Unit"
                        aria-label="Increase stock"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>

                  {/* Expiry Date & Badge */}
                  <td>
                    <div className="expiry-cell">
                      <span
                        className="expiry-tag"
                        style={{
                          backgroundColor: badgeInfo.bg,
                          color: badgeInfo.color,
                          borderColor: badgeInfo.borderColor,
                        }}
                      >
                        <span className="status-dot" style={{ backgroundColor: badgeInfo.dotColor }} />
                        {badgeInfo.label}
                      </span>
                      <span className="expiry-date-sub">{formatDate(med.expiryDate)}</span>
                    </div>
                  </td>

                  {/* Row Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        onClick={() => onViewDetails(med)}
                        className="btn-icon-action view"
                        title="View Full Medicine Details"
                        aria-label="View details"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() => onEdit(med)}
                        className="btn-icon-action edit"
                        title="Edit Medicine"
                        aria-label="Edit medicine"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => onDelete(med)}
                        className="btn-icon-action delete"
                        title="Delete Medicine"
                        aria-label="Delete medicine"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="pagination-info">
          <span>
            Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + rowsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> items
          </span>
          <div className="rows-selector">
            <span>Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rows-dropdown"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="pagination-buttons">
          <button
            onClick={() => handlePageChange(1)}
            disabled={safeCurrentPage === 1}
            className="btn-page"
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          
          <button
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="btn-page"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="page-indicator">
            Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="btn-page"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="btn-page"
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
