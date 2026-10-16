'use client';

import React, { useState } from 'react';
import VillageMap from '@/components/map/VillageMap';
import { MapPin, Info, Shield, Layers, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function MapPage() {
  const { t } = useTranslation();
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-7 h-7 text-green-600" />
            <span>{t('nav.map')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Interactive village infrastructure, facilities, open grievances, and resource matching locations
          </p>
        </div>

        {/* DPDP Act Privacy Notice Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <Shield className="w-3.5 h-3.5 text-green-600" />
          <span>Public Privacy: Coordinates snapped to ~200m coarse grid</span>
        </div>
      </div>

      {/* Main Interactive Map Canvas with Layer Controls */}
      <VillageMap selectedZone={selectedZone} />

      {/* Zone Legend and Map Info Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="font-extrabold text-green-700 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
            <span>Zone A (North Ward)</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Residential gaothan, Mandir, Z.P. High School, and Primary Health Centre sub-station.
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="font-extrabold text-amber-700 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Zone B (Central Bazaar)</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Gram Panchayat Office, CSC Kendra, Weekly Mandi, and Grain Storage Godown.
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="font-extrabold text-blue-700 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            <span>Zone C (Southern Farm Belt)</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Agricultural vastis, irrigation canal, tube-wells, and outer transit bus routes.
          </p>
        </div>
      </div>
    </div>
  );
}
