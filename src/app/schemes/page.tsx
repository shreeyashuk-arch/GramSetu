'use client';

import React, { useState } from 'react';
import schemesData from '@/lib/schemes.json';
import { HelpCircle, FileCheck, ArrowRight, CheckCircle2, Building, Volume2, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function SchemesPage() {
  const { t, speak, language } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedNeed, setSelectedNeed] = useState<string>('all');

  const filteredSchemes = schemesData.filter((s) => {
    const groupMatch = selectedGroup === 'all' || s.targetGroup === selectedGroup || s.targetGroup === 'all';
    const needMatch = selectedNeed === 'all' || s.needCategory === selectedNeed;
    return groupMatch && needMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-8 h-8 text-green-700" />
          <span>Village Welfare Scheme Navigator</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          A needs-first guided explorer for central and state rural development programs
        </p>
      </div>

      {/* Needs-First Guided Filter Cards */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider">
          Guided Filter: "Who are you and what do you need?"
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">I am a...</label>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {[
                { key: 'all', label: 'Anyone' },
                { key: 'farmer', label: 'Farmer (शेतकरी / किसान)' },
                { key: 'women', label: 'Woman / SHG (महिला बचत गट)' },
                { key: 'artisan', label: 'Artisan / Mistry (कारागीर)' },
              ].map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGroup(g.key)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    selectedGroup === g.key
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Seeking assistance for...</label>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {[
                { key: 'all', label: 'All Needs' },
                { key: 'irrigation', label: 'Solar Pump / Irrigation' },
                { key: 'agriculture', label: 'Direct Crop Financial Aid' },
                { key: 'health', label: 'Free Hospital Care' },
                { key: 'housing', label: 'Pucca House (घरकुल)' },
                { key: 'livelihood', label: 'Micro Enterprise Loan' },
                { key: 'tools', label: 'Tools & Skill Kit' },
              ].map((n) => (
                <button
                  key={n.key}
                  onClick={() => setSelectedNeed(n.key)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    selectedNeed === n.key
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-200'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scheme Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Found {filteredSchemes.length} matching candidate schemes to explore</span>
          <span className="italic">* Worded as "You may be eligible to explore". Final grant depends on department scrutiny.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchemes.map((scheme) => {
            const displayName =
              language === 'mr' ? scheme.nameMr : language === 'hi' ? scheme.nameHi : scheme.nameEn;
            const displayDesc =
              language === 'mr'
                ? scheme.descriptionMr
                : language === 'hi'
                ? scheme.descriptionHi
                : scheme.descriptionEn;

            return (
              <div
                key={scheme.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-100 text-green-800">
                      {scheme.department}
                    </span>
                    <button
                      onClick={() => speak(`${displayName}. ${displayDesc}`)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Read aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                    {displayName}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {displayDesc}
                  </p>

                  {/* Required Documents */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[11px] font-black uppercase text-slate-500">
                      Required Documents to Prepare:
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      {scheme.documents.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Where to Apply:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {scheme.whereToApply}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
