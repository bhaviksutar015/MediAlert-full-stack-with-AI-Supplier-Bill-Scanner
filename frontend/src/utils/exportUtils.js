/**
 * Export and Reporting Utilities for MediaAlert
 */
import { formatDate, getDaysUntilExpiry, getExpiryStatus } from './medicineUtils';

/**
 * Clean and escape values for CSV
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Export inventory medicines array to CSV file download
 */
export const exportMedicinesToCSV = (medicines = [], filename = 'inventory_export.csv') => {
  if (!medicines || medicines.length === 0) {
    throw new Error('No medicine data available to export.');
  }

  const headers = [
    'Medicine Name',
    'Generic Name',
    'Category',
    'Batch Number',
    'Manufacturer',
    'Quantity',
    'Min Stock',
    'Unit Price (INR)',
    'Total Value (INR)',
    'Expiry Date',
    'Days Until Expiry',
    'Status',
  ];

  const rows = medicines.map((med) => {
    const days = getDaysUntilExpiry(med.expiryDate);
    const status = getExpiryStatus(med.expiryDate);
    const qty = Number(med.quantity) || 0;
    const price = Number(med.price) || 0;
    const totalVal = (qty * price).toFixed(2);

    return [
      escapeCSV(med.name),
      escapeCSV(med.genericName || ''),
      escapeCSV(med.category || 'General'),
      escapeCSV(med.batchNumber || ''),
      escapeCSV(med.manufacturer || ''),
      escapeCSV(qty),
      escapeCSV(med.minimumStock || 10),
      escapeCSV(price.toFixed(2)),
      escapeCSV(totalVal),
      escapeCSV(formatDate(med.expiryDate)),
      escapeCSV(days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} days`),
      escapeCSV(status.toUpperCase()),
    ].join(',');
  });

  // UTF-8 BOM prefix (\uFEFF) ensures Microsoft Excel reads characters properly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Open browser print dialog with formatted medical inventory audit report
 */
export const printAuditReport = (medicines = [], reportTitle = 'Pharmacy Stock & Expiry Audit Report') => {
  if (!medicines || medicines.length === 0) {
    alert('No data available to print.');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalSKU = medicines.length;
  const totalStock = medicines.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const totalValue = medicines.reduce((sum, m) => sum + ((Number(m.quantity) || 0) * (Number(m.price) || 0)), 0);
  const expiredCount = medicines.filter((m) => getDaysUntilExpiry(m.expiryDate) < 0).length;
  const expiringSoonCount = medicines.filter((m) => {
    const d = getDaysUntilExpiry(m.expiryDate);
    return d >= 0 && d <= 30;
  }).length;

  const rowsHTML = medicines
    .map((med, idx) => {
      const days = getDaysUntilExpiry(med.expiryDate);
      let statusColor = '#166534';
      let statusText = 'Safe';
      if (days < 0) {
        statusColor = '#dc2626';
        statusText = 'EXPIRED';
      } else if (days <= 30) {
        statusColor = '#d97706';
        statusText = `Expiring (${days}d)`;
      }

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; ${days < 0 ? 'background-color: #fef2f2;' : ''}">
        <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 12px; font-weight: 600; font-size: 13px; color: #1e293b;">${med.name || '-'}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${med.batchNumber || '-'}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${med.category || 'General'}</td>
        <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 600;">${med.quantity || 0}</td>
        <td style="padding: 8px 12px; font-size: 12px; text-align: right;">₹${(Number(med.price) || 0).toFixed(2)}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #334155;">${formatDate(med.expiryDate)}</td>
        <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${statusColor};">${statusText}</td>
      </tr>`;
    })
    .join('');

  const reportHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .metric-card { text-align: center; }
          .metric-value { font-size: 18px; font-weight: 700; color: #0f172a; }
          .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 10px 12px; font-size: 11px; font-weight: 700; text-align: left; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">MediaAlert Pharmacy Management</h1>
            <div class="subtitle">${reportTitle} • Generated on ${today}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 600; color: #2563eb;">AUDIT VERIFIED</div>
            <div style="font-size: 11px; color: #94a3b8;">Confidential Medical Report</div>
          </div>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-value">${totalSKU}</div>
            <div class="metric-label">Total SKUs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalStock}</div>
            <div class="metric-label">Units in Stock</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div class="metric-label">Estimated Value</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #dc2626;">${expiredCount}</div>
            <div class="metric-label">Expired Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #d97706;">${expiringSoonCount}</div>
            <div class="metric-label">Expiring &lt;30d</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Medicine Name</th>
              <th>Batch No</th>
              <th>Category</th>
              <th style="text-align: right;">Stock</th>
              <th style="text-align: right;">Unit Price</th>
              <th>Expiry Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <div>Report printed by MediaAlert Inventory System</div>
          <div>Authorized Signature: _______________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
  }
};
