import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { logger } from '@/services/utils/logger';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      // If a theme is saved in localStorage, use it. Otherwise, default to dark.
      return savedTheme || 'dark';
    } catch (error) {
      logger.warn('Could not access localStorage for theme. Defaulting to dark.');
      return 'dark';
    }
  });

  useEffect(() => {
    // Apply the theme to the root element
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      logger.warn('Could not save theme to localStorage.');
    }
  }, [theme]);
  
  const value = useMemo(() => ({
    theme,
    setTheme,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
