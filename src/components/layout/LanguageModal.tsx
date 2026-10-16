'use client';

import React from 'react';
import { useTranslation, LANGUAGES, SupportedLanguage } from '@/lib/i18n';
import { Globe, Check } from 'lucide-react';

export default function LanguageModal() {
  const { isFirstVisit, language, setLanguage, dismissFirstVisit } = useTranslation();

  if (!isFirstVisit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 text-center">
        {/* Emblem / Icon */}
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Globe className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Choose Your Language
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium mb-1">
          अपनी भाषा चुनें / तुमची भाषा निवडा
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          You can change this anytime from the top bar.
        </p>

        {/* Big Touch Target Buttons for Rural Literacy */}
        <div className="space-y-3.5 mb-6">
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 text-left ${
                  isSelected
                    ? 'border-green-600 bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100 shadow-md ring-2 ring-green-600/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-black">{lang.nativeName}</div>
                  <div className="text-sm font-semibold opacity-75">{lang.label} ({lang.region})</div>
                </div>

                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isSelected
                      ? 'bg-green-600 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-5 h-5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={dismissFirstVisit}
          className="w-full py-4 px-6 bg-green-700 hover:bg-green-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-700/25 transition-transform active:scale-[0.98]"
        >
          Continue / आगे बढ़ें / पुढे चला →
        </button>
      </div>
    </div>
  );
}
