import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* @ts-ignore */}
      <LanguageProvider>
        {/* @ts-ignore */}
        <ThemeProvider>
          {/* @ts-ignore */}
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);