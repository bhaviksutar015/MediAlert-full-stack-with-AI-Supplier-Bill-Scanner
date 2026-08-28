import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3800) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((msg) => showToast(msg, 'success'), [showToast]);
  const showError = useCallback((msg) => showToast(msg, 'error', 5000), [showToast]);
  const showWarning = useCallback((msg) => showToast(msg, 'warning', 4500), [showToast]);
  const showInfo = useCallback((msg) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
      {children}
      <div className="toast-portal-container" aria-live="polite">
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let toastClass = 'toast-success';
          if (toast.type === 'error') {
            Icon = XCircle;
            toastClass = 'toast-error';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            toastClass = 'toast-warning';
          } else if (toast.type === 'info') {
            Icon = Info;
            toastClass = 'toast-info';
          }

          return (
            <div key={toast.id} className={`toast-card ${toastClass}`}>
              <Icon size={18} className="toast-icon" />
              <div className="toast-message">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="toast-close-btn"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if not inside provider to prevent crashes
    return {
      showToast: console.log,
      showSuccess: console.log,
      showError: console.error,
      showWarning: console.warn,
      showInfo: console.info,
      removeToast: () => {},
    };
  }
  return context;
};
