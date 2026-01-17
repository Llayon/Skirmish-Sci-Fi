import React, { useState, createContext, useContext } from 'react';

// Context to hold the active tab value and the function to set it
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
} | null>(null);

// Custom hook to access the context
const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a <Tabs> component.');
  }
  return context;
};

// Root Tabs component to provide context
export const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode }> = ({ defaultValue, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

// Component to wrap the list of triggers
export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return <div className={`border-b border-border flex space-x-4 overflow-x-auto ${className}`}>{children}</div>;
};

// The button to switch tabs
export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      role='tab'
      aria-selected={isActive}
      className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors -mb-px
        ${isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-text-muted hover:text-text-base hover:border-border'
        }`}
    >
      {children}
    </button>
  );
};

// The content panel for a tab
export const TabsContent: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div role='tabpanel' className='animate-fade-in mt-4'>
      {children}
    </div>
  );
};
