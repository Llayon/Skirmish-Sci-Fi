import React from 'react';

/**
 * Props for the Button component.
 * @property {React.ReactNode} children - The content to display inside the button.
 * @property {'primary' | 'secondary' | 'danger' | 'warning'} [variant='secondary'] - The color and style variant of the button.
 * @property {boolean} [isLoading=false] - If true, displays a loading spinner and disables the button.
 * @property {boolean} [selected=false] - If true, applies a visual style to indicate selection.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  isLoading?: boolean;
  selected?: boolean;
}

/**
 * A general-purpose button component with standardized styling and variants.
 * @param {ButtonProps} props - The component props.
 * @returns {React.ReactElement} The rendered button element.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  isLoading = false,
  selected = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-4 py-2 font-bold rounded-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/80 text-text-inverted shadow-md hover:shadow-lg focus-visible:ring-primary',
    secondary: 'bg-secondary hover:bg-secondary/80 text-text-base focus-visible:ring-secondary',
    danger: 'bg-danger hover:bg-danger/80 text-text-inverted focus-visible:ring-danger',
    warning: 'bg-warning hover:bg-warning/80 text-text-base focus-visible:ring-warning',
  };

  const selectedStyles = 'ring-2 ring-offset-0 ring-primary bg-primary/20 text-primary';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${selected ? selectedStyles : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className='animate-spin -ml-1 mr-3 h-5 w-5' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
