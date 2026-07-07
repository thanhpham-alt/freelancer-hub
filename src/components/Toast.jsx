import { createContext, useContext, useState, useCallback } from 'react';
import AppIcon from './AppIcon';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {} };
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <span className="toast-icon">
              {toast.type === 'success' && <AppIcon name="check" size={18} />}
              {toast.type === 'error' && <AppIcon name="alert" size={18} />}
              {toast.type === 'warning' && <AppIcon name="alert" size={18} />}
              {toast.type === 'info' && <AppIcon name="info" size={18} />}
            </span>
            <span style={{ marginLeft: '0.65rem', flex: 1 }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
