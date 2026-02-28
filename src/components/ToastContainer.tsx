import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastItem } from '../hooks/useToast';

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const TOAST_CONFIG = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.13)',  Icon: CheckCircle  },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.13)',   Icon: AlertCircle  },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.13)',  Icon: AlertTriangle },
  info:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.13)',  Icon: Info         },
} as const;

const ToastContainer: React.FC<Props> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
      width: 'calc(100% - 2rem)', maxWidth: '520px', pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const { color, bg, Icon } = TOAST_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: bg,
              border: `1px solid ${color}55`,
              borderRadius: '12px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              pointerEvents: 'all',
            }}
          >
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
              {toast.message}
            </span>
            <button
              onClick={() => onRemove(toast.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '2px', display: 'flex',
                flexShrink: 0,
              }}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
