import React from 'react';
import { Package, AlertCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { getDaysUntilExpiry } from '../utils/medicineUtils';

const KPICards = ({
  medicines = [],
  activeExpiryFilter = 'all',
  activeStockFilter = 'all',
  onSelectFilter,
}) => {
  const totalSKU = medicines.length;
  const totalUnits = medicines.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  
  const expiredMedicines = medicines.filter((m) => getDaysUntilExpiry(m.expiryDate) < 0);
  const expiringSoonMedicines = medicines.filter((m) => {
    const days = getDaysUntilExpiry(m.expiryDate);
    return days >= 0 && days <= 30;
  });
  const lowStockMedicines = medicines.filter((m) => {
    const qty = Number(m.quantity) || 0;
    const min = Number(m.minimumStock) || 10;
    return qty <= min;
  });

  const cards = [
    {
      id: 'total',
      title: 'Total Inventory',
      value: totalSKU,
      subtitle: `${totalUnits.toLocaleString()} total units`,
      icon: Package,
      accentColor: '#2563eb',
      bgLight: '#eff6ff',
      borderLight: '#bfdbfe',
      active: activeExpiryFilter === 'all' && activeStockFilter === 'all',
      onClick: () => onSelectFilter({ expiry: 'all', stock: 'all' }),
    },
    {
      id: 'expired',
      title: 'Expired Stock',
      value: expiredMedicines.length,
      subtitle: expiredMedicines.length > 0 ? 'Critical: Remove immediately' : 'Zero expired stock',
      icon: AlertCircle,
      accentColor: '#dc2626',
      bgLight: '#fef2f2',
      borderLight: '#fecaca',
      badge: expiredMedicines.length > 0 ? 'Urgent' : 'Clear',
      badgeType: expiredMedicines.length > 0 ? 'badge-red' : 'badge-green',
      active: activeExpiryFilter === 'expired',
      onClick: () => onSelectFilter({ expiry: activeExpiryFilter === 'expired' ? 'all' : 'expired', stock: 'all' }),
    },
    {
      id: 'expiring',
      title: 'Expiring Soon',
      value: expiringSoonMedicines.length,
      subtitle: 'Expiring in next 30 days',
      icon: Clock,
      accentColor: '#d97706',
      bgLight: '#fffbeb',
      borderLight: '#fde68a',
      badge: expiringSoonMedicines.length > 0 ? 'Action Needed' : 'Normal',
      badgeType: expiringSoonMedicines.length > 0 ? 'badge-yellow' : 'badge-green',
      active: activeExpiryFilter === 'expiring-soon',
      onClick: () => onSelectFilter({ expiry: activeExpiryFilter === 'expiring-soon' ? 'all' : 'expiring-soon', stock: 'all' }),
    },
    {
      id: 'lowStock',
      title: 'Low Stock Alert',
      value: lowStockMedicines.length,
      subtitle: 'Below reorder threshold',
      icon: AlertTriangle,
      accentColor: '#ea580c',
      bgLight: '#fff7ed',
      borderLight: '#fed7aa',
      badge: lowStockMedicines.length > 0 ? 'Restock' : 'Adequate',
      badgeType: lowStockMedicines.length > 0 ? 'badge-yellow' : 'badge-green',
      active: activeStockFilter === 'low-stock',
      onClick: () => onSelectFilter({ expiry: 'all', stock: activeStockFilter === 'low-stock' ? 'all' : 'low-stock' }),
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`kpi-card ${card.active ? 'kpi-card-active' : ''}`}
            style={{
              borderColor: card.active ? card.accentColor : undefined,
              boxShadow: card.active ? `0 0 0 2px ${card.accentColor}25, 0 8px 16px rgba(0,0,0,0.06)` : undefined,
            }}
            role="button"
            tabIndex={0}
            aria-pressed={card.active}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.onClick();
              }
            }}
          >
            <div className="kpi-card-top">
              <div
                className="kpi-icon-container"
                style={{ backgroundColor: card.bgLight, color: card.accentColor }}
              >
                <Icon size={22} />
              </div>
              {card.badge && (
                <span className={`kpi-status-badge ${card.badgeType}`}>
                  {card.badge}
                </span>
              )}
            </div>

            <div className="kpi-card-body">
              <span className="kpi-label">{card.title}</span>
              <div className="kpi-value-row">
                <span className="kpi-value" style={{ color: card.value > 0 && card.id !== 'total' ? card.accentColor : '#0f172a' }}>
                  {card.value}
                </span>
              </div>
              <span className="kpi-subtext">{card.subtitle}</span>
            </div>

            {card.active && (
              <div className="kpi-active-indicator" style={{ backgroundColor: card.accentColor }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
