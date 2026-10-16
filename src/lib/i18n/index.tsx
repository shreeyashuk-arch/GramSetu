'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './dictionaries/en.json';
import hi from './dictionaries/hi.json';
import mr from './dictionaries/mr.json';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export const LANGUAGES: { code: SupportedLanguage; label: string; nativeName: string; region: string }[] = [
  { code: 'en', label: 'English', nativeName: 'English', region: 'India' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', region: 'भारत' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी', region: 'महाराष्ट्र' },
];

const dictionaries: Record<SupportedLanguage, any> = { en, hi, mr };

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, fallback?: string) => string;
  speak: (text: string) => void;
  isFirstVisit: boolean;
  dismissFirstVisit: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('hi');
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('gramsetu_lang') as SupportedLanguage;
    const hasChosen = localStorage.getItem('gramsetu_lang_chosen');

    if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'mr')) {
      setLanguageState(savedLang);
    } else {
      // First visit - flag to show full-screen language selector modal
      setIsFirstVisit(true);
    }

    if (!hasChosen) {
      setIsFirstVisit(true);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('gramsetu_lang', lang);
    localStorage.setItem('gramsetu_lang_chosen', 'true');
    document.cookie = `gramsetu_lang=${lang}; path=/; max-age=31536000`;
    setIsFirstVisit(false);
  };

  const dismissFirstVisit = () => {
    localStorage.setItem('gramsetu_lang_chosen', 'true');
    setIsFirstVisit(false);
  };

  // Helper function to resolve nested keys like "report.title"
  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = dictionaries[language] || dictionaries.en;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary
        let enFallback: any = dictionaries.en;
        for (const k of keys) {
          if (enFallback && typeof enFallback === 'object' && k in enFallback) {
            enFallback = enFallback[k];
          } else {
            enFallback = undefined;
            break;
          }
        }
        return typeof enFallback === 'string' ? enFallback : fallback || path;
      }
    }

    return typeof current === 'string' ? current : fallback || path;
  };

  // Voice Read-back (Text to Speech)
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      if (language === 'hi') {
        utterance.lang = 'hi-IN';
      } else if (language === 'mr') {
        utterance.lang = 'mr-IN';
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.rate = 0.9; // clear, comfortable pace for rural listeners
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        speak,
        isFirstVisit: mounted ? isFirstVisit : false,
        dismissFirstVisit,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
