import React, { useState, useMemo, useRef } from 'react';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
  flip,
  size,
  autoUpdate
} from '@floating-ui/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder = 'Select...', disabled = false, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const { refs, floatingStyles, context } = useFloating({
    placement: 'bottom-start',
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      flip(),
      size({
        apply({ rects, elements }: any) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ]
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'listbox' }),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex
    })
  ]);

  const selectedLabel = useMemo(() => {
    return options.find(o => o.value === value)?.label || placeholder;
  }, [options, value, placeholder]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        disabled={disabled}
        className='w-full flex items-center justify-between text-left px-3 py-2 bg-secondary border border-border rounded-md text-text-base text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50'
        aria-label={props['aria-label']}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <FloatingPortal>
        {isOpen && (
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className='z-50 bg-surface-overlay border border-border rounded-md shadow-lg overflow-y-auto max-h-60'
            >
              {options.map((option, index) => (
                <div
                  ref={node => {
                    listRef.current[index] = node;
                  }}
                  key={option.value}
                  role='option'
                  aria-selected={option.value === value}
                  tabIndex={activeIndex === index ? 0 : -1}
                  {...getItemProps({
                    onClick: () => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    },
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' && !option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }
                  })}
                  className={`px-3 py-2 text-sm text-text-base cursor-pointer hover:bg-primary/20 ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${activeIndex === index ? 'bg-primary/20' : ''} flex items-center justify-between`}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} className='text-primary' />}
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </>
  );
};