import React from 'react';

/**
 * Props for the Card component.
 * @property {React.ReactNode} children - The content to be rendered inside the card.
 * @property {string} [className] - Additional CSS classes to apply to the card.
 * @property {'default' | 'interactive'} [variant='default'] - The visual and behavioral variant of the card.
 * @property {() => void} [onClick] - A callback function to execute when the card is clicked.
 * @property {React.CSSProperties} [style] - Inline styles for the card.
 */
// FIX: Extend React.HTMLAttributes<HTMLDivElement> to allow any standard div props, like onMouseEnter.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'interactive';
}

/**
 * A stylized container component with a consistent border, shadow, and padding.
 * It serves as a base for most UI panels in the application.
 * @param {CardProps} props - The component props.
 * @returns {React.ReactElement} The rendered card component.
 */
const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', ...props }) => {
  const variantStyles = {
    default: '',
    interactive: 'transition-all duration-300 hover:border-primary/80 hover:shadow-xl cursor-pointer'
  };

  return (
    <div className={`fp-card bg-surface-raised border border-border rounded-lg shadow-lg p-4 sm:p-6 ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;