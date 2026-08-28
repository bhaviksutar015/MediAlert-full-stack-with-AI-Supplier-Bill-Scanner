import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) => {
  return (
    <div className="error-card-banner">
      <div className="error-card-header">
        <AlertCircle size={20} className="error-icon" />
        <div>
          <h4>{title}</h4>
          <p>{message}</p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm" style={{ marginTop: '0.75rem', gap: '0.4rem' }}>
          <RefreshCw size={14} /> Retry Connection
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
