
import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { handleError } from '@/services/utils/errorHandler';
import { logger } from '@/services/utils/logger';

// Define namespaces and languages
const namespaces = ['common', 'crewCreator', 'dashboard', 'battle', 'items', 'missions', 'log', 'travel', 'buttons'];
const supportedLanguages = ['en', 'ru'];

interface LanguageContextType {
  language: string;
  availableLanguages: string[];
  setLanguage: (language: string) => void;
  t: (key: string, params?: Record<string, string | number | boolean>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [translations, setTranslations] = useState<Record<string, any> | null>(null);
  
  const [language, setLanguage] = useState<string>(() => {
    try {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
          return savedLanguage;
        }
        const browserLanguage = navigator.language.split(/[-_]/)[0];
        return supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';
    } catch (error) {
        logger.warn('Could not access localStorage. Defaulting to English.');
        return 'en';
    }
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const translationsData: Record<string, any> = {};

        for (const lang of supportedLanguages) {
          const promises = namespaces.map(ns => 
            fetch(`./locales/${lang}/${ns}.json`).then(res => {
              if (!res.ok) {
                throw new Error(`Failed to fetch ${lang}/${ns}.json: ${res.statusText}`);
              }
              return res.json();
            }).catch(err => {
                console.error(`Failed to load namespace ${ns} for language ${lang}:`, err);
                return {}; // Return empty object on fail so other namespaces still load
            })
          );
          
          const namespaceData = await Promise.all(promises);
          
          // Merge all namespace objects into one for the language
          translationsData[lang] = namespaceData.reduce((acc, data) => ({ ...acc, ...data }), {});
        }
        
        setTranslations(translationsData);
      } catch (error) {
        if (error instanceof Error) {
            handleError(error, { context: "Error loading translation files" });
        } else {
            logger.error("An unknown error occurred while loading translations:", error);
        }
        // Fallback to empty objects to prevent the app from crashing
        setTranslations({ en: {}, ru: {} });
      }
    };
    
    fetchTranslations();
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('language', language);
    } catch (error) {
        logger.warn('Could not access localStorage to save language preference.');
    }
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number | boolean>): string => {
    if (!translations) {
        return key; // Return key as a fallback while loading
    }

    const currentLangData = translations[language];
    const defaultLangData = translations['en'];
    
    let text: string | undefined;

    // Helper to resolve key from data (handles both flat "foo.bar" and nested {foo: {bar: ...}})
    const resolveKey = (data: any, k: string) => {
        if (!data) return undefined;
        // 1. Check exact match (flat key)
        if (typeof data[k] === 'string') return data[k];
        
        // 2. Check nested
        const parts = k.split('.');
        let current = data;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        return typeof current === 'string' ? current : undefined;
    };

    text = resolveKey(currentLangData, key);
    if (text === undefined && language !== 'en') {
        text = resolveKey(defaultLangData, key);
    }

    let translatedString = text !== undefined ? text : key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translatedString = translatedString.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return translatedString;
  }, [language, translations]);
  
  const availableLanguages = useMemo(() => (translations ? Object.keys(translations) : []), [translations]);
  
  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    availableLanguages
  }), [language, t, availableLanguages, setLanguage]);

  if (!translations) {
      return null;
  }

  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
