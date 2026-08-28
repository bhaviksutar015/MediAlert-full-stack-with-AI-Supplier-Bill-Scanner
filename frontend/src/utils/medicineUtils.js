/**
 * Core utility functions for MediaAlert medicine inventory
 */

/**
 * Calculate difference in whole days between expiry date and today
 * Negative values indicate the medicine is already expired.
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determine granular expiry status based on threshold days
 */
export const getExpiryStatus = (expiryDate, thresholdDays = 30) => {
  if (!expiryDate) return 'unknown';
  const days = getDaysUntilExpiry(expiryDate);
  
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical'; // Expiring within a week
  if (days <= thresholdDays) return 'expiring-soon';
  if (days <= 90) return 'expiring-quarter';
  return 'safe';
};

/**
 * Returns user-friendly status badge metadata
 */
export const getExpiryBadgeInfo = (expiryDate, thresholdDays = 30) => {
  const status = getExpiryStatus(expiryDate, thresholdDays);
  const days = getDaysUntilExpiry(expiryDate);
  
  switch (status) {
    case 'expired':
      return {
        label: `Expired (${Math.abs(days)}d ago)`,
        status: 'expired',
        bg: '#fee2e2',
        color: '#991b1b',
        borderColor: '#fca5a5',
        dotColor: '#ef4444',
      };
    case 'critical':
      return {
        label: days === 0 ? 'Expires Today' : `Expires in ${days}d`,
        status: 'critical',
        bg: '#ffedd5',
        color: '#9a3412',
        borderColor: '#fdba74',
        dotColor: '#f97316',
      };
    case 'expiring-soon':
      return {
        label: `Expiring (${days}d)`,
        status: 'expiring-soon',
        bg: '#fef3c7',
        color: '#92400e',
        borderColor: '#fcd34d',
        dotColor: '#eab308',
      };
    case 'expiring-quarter':
      return {
        label: `Good (${days}d left)`,
        status: 'expiring-quarter',
        bg: '#f0fdf4',
        color: '#166534',
        borderColor: '#bbf7d0',
        dotColor: '#22c55e',
      };
    case 'safe':
    default:
      return {
        label: `Safe (${days}d)`,
        status: 'safe',
        bg: '#eff6ff',
        color: '#1e40af',
        borderColor: '#bfdbfe',
        dotColor: '#3b82f6',
      };
  }
};

/**
 * Determine stock level status
 */
export const getStockStatus = (quantity, minimumStock = 10) => {
  const qty = Number(quantity) || 0;
  const min = Number(minimumStock) || 10;
  
  if (qty <= 0) {
    return {
      status: 'out-of-stock',
      label: 'Out of Stock',
      color: '#dc2626',
      bg: '#fef2f2',
      badgeClass: 'badge-red',
    };
  }
  if (qty <= min) {
    return {
      status: 'low-stock',
      label: `${qty} Units (Low)`,
      color: '#d97706',
      bg: '#fffbeb',
      badgeClass: 'badge-yellow',
    };
  }
  return {
    status: 'in-stock',
    label: `${qty} Units`,
    color: '#15803d',
    bg: '#f0fdf4',
    badgeClass: 'badge-green',
  };
};

/**
 * Format standard readable date
 */
export const formatDate = (dateString, format = 'short') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  if (format === 'input') {
    return date.toISOString().split('T')[0];
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Currency formatter with symbol support
 */
export const formatCurrency = (amount, currency = '₹') => {
  const val = Number(amount) || 0;
  return `${currency}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Multi-dimension filter for medicines
 */
export const filterMedicinesList = (medicines = [], {
  searchTerm = '',
  categoryFilter = 'all',
  expiryFilter = 'all',
  stockFilter = 'all',
}) => {
  const term = searchTerm.trim().toLowerCase();
  
  return medicines.filter((med) => {
    // 1. Search term match (Name, Generic Name, Batch No, Manufacturer)
    const nameMatch = (med.name || '').toLowerCase().includes(term);
    const genericMatch = (med.genericName || '').toLowerCase().includes(term);
    const batchMatch = (med.batchNumber || '').toLowerCase().includes(term);
    const manufacturerMatch = (med.manufacturer || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || genericMatch || batchMatch || manufacturerMatch;
    if (!matchesSearch) return false;

    // 2. Category filter
    if (categoryFilter !== 'all' && (med.category || 'General').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    // 3. Expiry status filter
    const days = getDaysUntilExpiry(med.expiryDate);
    if (expiryFilter === 'expired' && days >= 0) return false;
    if (expiryFilter === 'expiring-soon' && (days < 0 || days > 30)) return false;
    if (expiryFilter === 'expiring-90' && (days < 0 || days > 90)) return false;
    if (expiryFilter === 'safe' && days <= 30) return false;

    // 4. Stock status filter
    const qty = Number(med.quantity) || 0;
    const minStock = Number(med.minimumStock) || 10;
    if (stockFilter === 'out-of-stock' && qty > 0) return false;
    if (stockFilter === 'low-stock' && (qty <= 0 || qty > minStock)) return false;
    if (stockFilter === 'in-stock' && qty <= minStock) return false;

    return true;
  });
};

/**
 * Sort medicines by column key and direction
 */
export const sortMedicinesList = (medicines = [], sortConfig = { key: null, direction: 'ascending' }) => {
  if (!sortConfig || !sortConfig.key) return medicines;
  
  const sorted = [...medicines].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Handle string values (case-insensitive)
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    // Handle Dates
    if (sortConfig.key === 'expiryDate' || sortConfig.key === 'createdAt') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }

    // Handle Numeric values
    if (sortConfig.key === 'quantity' || sortConfig.key === 'price' || sortConfig.key === 'minimumStock') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  return sorted;
};
