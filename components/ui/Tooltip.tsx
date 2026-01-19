
import React, { useState, useRef } from 'react';
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useClick,
  FloatingPortal,
  FloatingArrow,
  arrow,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';

/**
 * Props for the Tooltip component.
 * @property {React.ReactNode} children - The element that will trigger the tooltip on hover or focus.
 * @property {string | React.ReactNode} content - The content to display inside the tooltip.
 * @property {string} [className] - Optional CSS class for the wrapper element.
 * @property {React.ElementType} [as='span'] - The HTML element type to use for the wrapper.
 */
interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  className?: string;
  as?: 'span' | 'div';
}

/**
 * A component that displays a small pop-up with information when a user hovers over or focuses on an element.
 * It uses Floating UI for robust positioning and accessibility.
 * @param {TooltipProps} props - The component props.
 * @returns {React.ReactElement} The rendered children wrapped with tooltip functionality.
 */
const Tooltip: React.FC<TooltipProps> = ({ children, content, className = '', as: Component = 'span' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { x, y, refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: 'start',
        crossAxis: false,
      }),
      shift(),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, { move: false, delay: { open: 300, close: 150 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const click = useClick(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
    click,
  ]);

  if (!content) {
    return <>{children}</>;
  }

  const wrapperProps = className ? { className } : { style: { display: 'contents' as const } };
  const WrapperComponent = Component;

  return (
    <>
      <WrapperComponent ref={refs.setReference} {...wrapperProps} {...getReferenceProps()}>
        {children}
      </WrapperComponent>
      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={{
              position: context.strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: 'max-content',
            }}
            className='z-50 max-w-xs'
            {...getFloatingProps()}
          >
            <div
              className='bg-surface-overlay text-text-base text-xs rounded-md p-2 border border-border shadow-lg animate-tooltip-in'
              role='tooltip'
            >
              {content}
              <FloatingArrow
                ref={arrowRef}
                context={context}
                className='fill-surface-overlay'
              />
            </div>
          </div>
        )}
      </FloatingPortal>
    </>
  );
};

export default Tooltip;
