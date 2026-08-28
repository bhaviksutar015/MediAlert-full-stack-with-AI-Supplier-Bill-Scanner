import React from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  RotateCcw,
  X
} from 'lucide-react';

const FilterBar = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  expiryFilter,
  onExpiryChange,
  stockFilter,
  onStockChange,
  categories = [],
  onResetFilters,
  hasActiveFilters,
  onAddNew,
  onExportCSV,
  onPrintReport,
  totalMatching,
}) => {
  return (
    <div className="filter-bar-card">
      
      {/* Top row: Search input + Actions */}
      <div className="filter-top-row">
        
        {/* Search input */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search medicine, generic formula, batch no... (Ctrl + K)"
            className="filter-search-input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="search-clear-btn"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="filter-actions-group">
          <button
            onClick={onExportCSV}
            className="btn-secondary btn-icon-text"
            title="Download formatted CSV spreadsheet for Excel"
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={onPrintReport}
            className="btn-secondary btn-icon-text"
            title="Print formal pharmacy audit sheet"
          >
            <Printer size={15} /> Print Audit
          </button>

          <button
            onClick={onAddNew}
            className="btn-primary btn-icon-text"
            title="Add a new medicine manually or scan box (Shortcut: N)"
          >
            <Plus size={16} /> Add Medicine
          </button>
        </div>

      </div>

      {/* Bottom row: Filter dropdowns */}
      <div className="filter-bottom-row">
        
        <div className="filter-select-group">
          <Filter size={14} className="filter-label-icon text-slate-500" />
          <span className="filter-group-title">Filters:</span>
          
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="filter-dropdown"
            aria-label="Filter by category"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Expiry Stage Filter */}
          <select
            value={expiryFilter}
            onChange={(e) => onExpiryChange(e.target.value)}
            className="filter-dropdown"
            aria-label="Filter by expiry status"
          >
            <option value="all">All Expiry Statuses</option>
            <option value="expired">Expired (Requires Disposal)</option>
            <option value="expiring-soon">Expiring in 30 Days</option>
            <option value="expiring-90">Expiring in 90 Days</option>
            <option value="safe">Safe (&gt; 30 Days)</option>
          </select>

          {/* Stock Level Filter */}
          <select
            value={stockFilter}
            onChange={(e) => onStockChange(e.target.value)}
            className="filter-dropdown"
            aria-label="Filter by stock level"
          >
            <option value="all">All Stock Levels</option>
            <option value="in-stock">In Stock (&gt; Min Threshold)</option>
            <option value="low-stock">Low Stock (≤ Min Threshold)</option>
            <option value="out-of-stock">Out of Stock (0 Units)</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="btn-reset-filters"
              title="Reset all search and filter conditions"
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
          )}
        </div>

        <div className="matching-count-badge">
          <span>{totalMatching} item{totalMatching === 1 ? '' : 's'} matching</span>
        </div>

      </div>

    </div>
  );
};

export default FilterBar;
