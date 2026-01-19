import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  disableClose?: boolean;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ onClose, children, disableClose = false, title }) => {
  const modalRoot = document.getElementById('root');
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (disableClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableClose]);

  useEffect(() => {
    const modalElement = modalContentRef.current;
    if (!modalElement) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // shift + tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modalElement.addEventListener('keydown', handleTabKey);

    return () => {
      modalElement.removeEventListener('keydown', handleTabKey);
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableClose) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!modalRoot) return null;

  // The modal content itself will be the first child passed, which should be a Card.
  // We'll inject the header into it.
  const child = React.Children.only(children) as React.ReactElement<{ className?: string; children?: React.ReactNode;[key: string]: any; }>;
  const childProps = child.props;
  const modalContent = React.cloneElement(child, {
    ...childProps,
    className: `${childProps.className || ''} w-full flex flex-col`, // Ensure it's a flex column
    children: (
      <>
        {(title || !disableClose) && (
          <div className='flex justify-between items-center pb-3 mb-4 border-b border-border'>
            {title && <h3 id='modal-title' className='text-xl font-bold font-orbitron text-primary'>{title}</h3>}
            {!disableClose && (
              <Button onClick={onClose} variant='secondary' className='p-2 h-auto ml-auto -mr-2 -mt-2'>
                <span className='sr-only'>Close modal</span>
                <X size={18} />
              </Button>
            )}
          </div>
        )}
        <div className='flex-grow overflow-y-auto'>
          {childProps.children}
        </div>
      </>
    ),
  });

  return createPortal(
    <div
      className='fixed inset-0 bg-surface-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'
      onClick={handleBackdropClick}
      aria-modal='true'
      role='dialog'
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div ref={modalContentRef} className='w-full max-h-[90vh] flex justify-center'>
        {modalContent}
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
