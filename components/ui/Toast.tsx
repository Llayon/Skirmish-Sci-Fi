import React, { useEffect, useState } from 'react';
import { ToastMessage } from '@/context/ToastContext';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircle className='text-success' />,
  error: <XCircle className='text-danger' />,
  info: <Info className='text-info' />,
  warning: <AlertTriangle className='text-warning' />,
};

const BORDER_COLORS: Record<ToastMessage['type'], string> = {
  success: 'border-success/50',
  error: 'border-danger/50',
  info: 'border-info/50',
  warning: 'border-warning/50',
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    setIsFadingOut(true);
    // Wait for the fade-out animation to complete before removing from DOM
    setTimeout(() => {
      onDismiss(toast.id);
    }, 500); // Must match the fadeOut animation duration in tailwind.config
  };

  return (
    <div
      role='alert'
      aria-live='assertive'
      aria-atomic='true'
      className={`
        flex items-start w-full max-w-sm p-4 rounded-lg shadow-lg
        bg-surface-overlay border ${BORDER_COLORS[toast.type]}
        ${isFadingOut ? 'animate-fade-out' : 'animate-slide-in-right'}
      `}
    >
      <div className='flex-shrink-0 w-6 h-6'>{ICONS[toast.type]}</div>
      <div className='ml-3 mr-4 flex-1 text-sm font-medium text-text-base'>
        {toast.message}
      </div>
      <button
        onClick={handleDismiss}
        className='p-1 -m-1 rounded-full text-text-muted hover:bg-secondary'
        aria-label='Dismiss'
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
