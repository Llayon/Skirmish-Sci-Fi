import React from 'react';
import { useToast } from '@/context/ToastContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      aria-live='polite'
      className='fixed top-4 right-4 z-50 w-full max-w-sm space-y-3 pointer-events-none'
    >
      {toasts.map(toast => (
        <div key={toast.id} className='pointer-events-auto'>
          <Toast toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
