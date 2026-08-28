import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Download,
  Printer,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  Layers
} from 'lucide-react';
import {
  getDaysUntilExpiry,
  formatCurrency,
  formatDate
} from '../utils/medicineUtils';
import { exportMedicinesToCSV, printAuditReport } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';

const Analytics = ({ medicines = [] }) => {
  const { showSuccess, showError } = useToast();

  if (!medicines || medicines.length === 0) {
    return (
      <div className="reports-empty-card">
        <Package size={40} color="#94a3b8" />
        <h3>No Inventory Data to Analyze</h3>
        <p>Add medicines to your inventory to view real-time valuation, category distributions, and expiry risk horizons.</p>
      </div>
    );
  }

  // 1. Total Metrics Computation
  const totalSKUs = medicines.length;
  const totalUnits = medicines.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const totalValue = medicines.reduce(
    (sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.price) || 0),
    0
  );

  const expiredMedicines = medicines.filter((m) => getDaysUntilExpiry(m.expiryDate) < 0);
  const expiredLoss = expiredMedicines.reduce(
    (sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.price) || 0),
    0
  );

  const expiringSoonMedicines = medicines.filter((m) => {
    const d = getDaysUntilExpiry(m.expiryDate);
    return d >= 0 && d <= 30;
  });
  const expiringSoonValue = expiringSoonMedicines.reduce(
    (sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.price) || 0),
    0
  );

  // 2. Category Distribution
  const categoryMap = {};
  medicines.forEach((med) => {
    const cat = med.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const pieData = Object.keys(categoryMap).map((key) => ({
    name: key,
    value: categoryMap[key],
  }));

  // 3. Expiry Risk Horizon Distribution
  const expiryHorizon = {
    'Expired': 0,
    '< 30 Days': 0,
    '30 - 60 Days': 0,
    '60 - 90 Days': 0,
    'Safe (> 90d)': 0,
  };

  medicines.forEach((m) => {
    const days = getDaysUntilExpiry(m.expiryDate);
    if (days < 0) expiryHorizon['Expired'] += 1;
    else if (days <= 30) expiryHorizon['< 30 Days'] += 1;
    else if (days <= 60) expiryHorizon['30 - 60 Days'] += 1;
    else if (days <= 90) expiryHorizon['60 - 90 Days'] += 1;
    else expiryHorizon['Safe (> 90d)'] += 1;
  });

  const horizonData = Object.keys(expiryHorizon).map((key) => ({
    horizon: key,
    count: expiryHorizon[key],
  }));

  // 4. Top Stock Items
  const topStockData = [...medicines]
    .sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))
    .slice(0, 6)
    .map((med) => ({
      name: med.name.length > 14 ? `${med.name.substring(0, 12)}...` : med.name,
      fullName: med.name,
      stock: Number(med.quantity) || 0,
    }));

  // Professional color palette
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  const handleExportCSV = () => {
    try {
      exportMedicinesToCSV(medicines, 'MediaAlert_Full_Inventory_Report.csv');
      showSuccess('Inventory report exported to CSV successfully.');
    } catch (err) {
      showError(err.message || 'Export failed.');
    }
  };

  const handlePrint = () => {
    printAuditReport(medicines, 'Comprehensive Pharmacy Valuation & Audit Report');
  };

  return (
    <div className="analytics-dashboard">
      
      {/* Header with Export Controls */}
      <div className="analytics-header">
        <div>
          <h2>Reports & Valuation Intelligence</h2>
          <p>Real-time pharmacy stock valuation, category exposure, and regulatory expiry forecasts</p>
        </div>

        <div className="analytics-actions">
          <button onClick={handleExportCSV} className="btn-secondary btn-icon-text">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={handlePrint} className="btn-primary btn-icon-text">
            <Printer size={15} /> Print Audit Sheet
          </button>
        </div>
      </div>

      {/* Financial Valuation Metric Cards */}
      <div className="valuation-metrics-grid">
        
        <div className="val-card">
          <div className="val-card-icon bg-blue-50 text-blue-600">
            <DollarSign size={20} />
          </div>
          <div className="val-card-content">
            <span className="val-card-label">Total Inventory Value</span>
            <h3 className="val-card-number text-blue-600">{formatCurrency(totalValue)}</h3>
            <span className="val-card-subtext">{totalUnits.toLocaleString()} units across {totalSKUs} SKUs</span>
          </div>
        </div>

        <div className="val-card">
          <div className="val-card-icon bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="val-card-content">
            <span className="val-card-label">Expired Stock Loss</span>
            <h3 className="val-card-number text-red-600">{formatCurrency(expiredLoss)}</h3>
            <span className="val-card-subtext">{expiredMedicines.length} expired medicines pending write-off</span>
          </div>
        </div>

        <div className="val-card">
          <div className="val-card-icon bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
          <div className="val-card-content">
            <span className="val-card-label">Value at Risk (&lt; 30d)</span>
            <h3 className="val-card-number text-amber-600">{formatCurrency(expiringSoonValue)}</h3>
            <span className="val-card-subtext">{expiringSoonMedicines.length} medicines eligible for distributor return</span>
          </div>
        </div>

      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* Chart 1: Expiry Horizon */}
        <div className="chart-panel-card">
          <div className="chart-panel-header">
            <h3>Expiry Risk Timeline</h3>
            <span className="chart-badge">Timeline Forecast</span>
          </div>
          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={horizonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="horizon" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(val) => [`${val} Medicines`, 'Count']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="chart-panel-card">
          <div className="chart-panel-header">
            <h3>Inventory by Category</h3>
            <span className="chart-badge">Distribution</span>
          </div>
          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Items (${((val / totalSKUs) * 100).toFixed(0)}%)`, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Top Stock Level Items */}
        <div className="chart-panel-card full-span">
          <div className="chart-panel-header">
            <h3>Top 6 Highest Volume Stock Items</h3>
            <span className="chart-badge">Volume</span>
          </div>
          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topStockData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(val) => [`${val} Units in stock`, 'Quantity']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;