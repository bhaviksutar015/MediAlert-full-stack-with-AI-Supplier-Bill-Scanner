import React from 'react';
import { PackageOpen, Search, FilterX, Plus } from 'lucide-react';

const EmptyState = ({
  type = 'no-data',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  let Icon = PackageOpen;
  let defaultTitle = 'No medicines in inventory';
  let defaultMessage = 'Get started by adding your first medicine or scanning packaging.';

  if (type === 'no-search-results') {
    Icon = Search;
    defaultTitle = 'No matching medicines found';
    defaultMessage = 'Try refining your search terms or clearing active category and status filters.';
  } else if (type === 'no-filtered-results') {
    Icon = FilterX;
    defaultTitle = 'No medicines match current filter';
    defaultMessage = 'No inventory items match the selected expiry or stock criteria.';
  }

  return (
    <div className="empty-state-wrapper">
      <div className="empty-state-icon-circle">
        <Icon size={32} color="#64748b" />
      </div>
      <h3 className="empty-state-title">{title || defaultTitle}</h3>
      <p className="empty-state-message">{message || defaultMessage}</p>
      
      <div className="empty-state-actions">
        {onAction && actionLabel && (
          <button onClick={onAction} className="btn-primary">
            <Plus size={16} /> {actionLabel}
          </button>
        )}
        {onSecondaryAction && secondaryActionLabel && (
          <button onClick={onSecondaryAction} className="btn-secondary">
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
