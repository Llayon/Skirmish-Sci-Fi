import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeDisabled();
  });

  it('applies the correct variant class', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });

  it('shows a loading state', () => {
    render(<Button isLoading>Loading</Button>);
    const buttonElement = screen.getByRole('button');
    expect(buttonElement).toBeDisabled();
    // Check for the SVG loader element
    expect(buttonElement.querySelector('svg')).toBeInTheDocument();
  });
});