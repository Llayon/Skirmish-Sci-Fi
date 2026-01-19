/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
    './types/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        orbitron: ['var(--font-family-heading)', 'sans-serif'],
        mono: ['var(--font-family-body)', 'monospace'],
      },
      colors: {
        primary: 'hsl(var(--color-primary) / <alpha-value>)',
        secondary: 'hsl(var(--color-secondary) / <alpha-value>)',
        danger: 'hsl(var(--color-danger) / <alpha-value>)',
        accent: 'hsl(var(--color-accent) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        info: 'hsl(var(--color-info) / <alpha-value>)',

        'surface-base': 'hsl(var(--color-surface-base) / <alpha-value>)',
        'surface-raised': 'hsl(var(--color-surface-raised) / <alpha-value>)',
        'surface-overlay': 'hsl(var(--color-surface-overlay) / <alpha-value>)',

        'text-base': 'hsl(var(--color-text-base) / <alpha-value>)',
        'text-muted': 'hsl(var(--color-text-muted) / <alpha-value>)',
        'text-inverted': 'hsl(var(--color-text-inverted) / <alpha-value>)',

        border: 'hsl(var(--color-border) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        fadeOut: {
          from: { opacity: 1 },
          to: { opacity: 0, transform: 'translateX(20px)' },
        },
        tooltipIn: {
          from: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        'bg-pan': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'text-flicker': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        glow: {
          '0%, 100%': { textShadow: '0 0 5px hsl(var(--color-primary)), 0 0 10px hsl(var(--color-primary))' },
          '50%': { textShadow: '0 0 10px hsl(var(--color-primary)), 0 0 20px hsl(var(--color-primary))' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards',
        'fade-out': 'fadeOut 0.5s ease-in forwards',
        'hud-fade-out': 'fadeOut 1s ease-in-out 0.5s forwards',
        'tooltip-in': 'tooltipIn 0.1s ease-out forwards',
        'bg-pan': 'bg-pan 30s ease infinite',
        'text-flicker': 'text-flicker 3s infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

