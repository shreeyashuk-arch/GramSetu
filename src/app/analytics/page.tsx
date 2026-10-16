'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Activity,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AnalyticsPage() {
  const { t, speak } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Village Service Health Index', `${data.summary.healthIndex}/100`],
      ['Total Grievances', data.summary.totalComplaints],
      ['Active Grievances', data.summary.activeComplaints],
      ['Critical Priority Open', data.summary.criticalComplaints],
      ['Resolved Issues', data.summary.resolvedComplaints],
      ['Average Resolution Time', `${data.summary.avgResolutionTimeHours} hours`],
      ['Resolution Rate', `${data.summary.resolutionPercentage}%`],
      ['Seasonal Alert', data.seasonalAlert?.alertTitle || 'None'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GramSetu_Weekly_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    speak('Weekly village progress report downloaded.');
  };

  const exportPrintable = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-8 h-8 text-green-700" />
            <span>{t('analytics.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gram Panchayat infrastructure uptime, service speed, and seasonal demand predictions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportPrintable}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Village Service Health Index Card */}
      <div className="bg-gradient-to-br from-green-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
            {t('analytics.healthIndex')}
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl sm:text-6xl font-black">
              {data?.summary?.healthIndex || 88}
            </span>
            <span className="text-xl text-emerald-300 font-bold">/ 100</span>
          </div>
          <p className="text-sm text-emerald-100 font-medium">
            Shivapur Village Service Index is currently in the <strong>HIGH EFFICIENCY</strong> tier. 18 issues resolved with resident satisfaction confirmation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <span className="text-emerald-300 block font-bold">Resolution Rate</span>
            <span className="text-2xl font-black">{data?.summary?.resolutionPercentage || 30}%</span>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <span className="text-emerald-300 block font-bold">Avg SLA Time</span>
            <span className="text-2xl font-black">{data?.summary?.avgResolutionTimeHours || 28}h</span>
          </div>
        </div>
      </div>

      {/* Seasonal Demand Alert */}
      {data?.seasonalAlert && (
        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
              {data.seasonalAlert.season}
            </span>
            <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
              {data.seasonalAlert.alertTitle}
            </h3>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200">
            {data.seasonalAlert.description}
          </p>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 pt-1">
            <strong>Recommended Action:</strong> {data.seasonalAlert.actionItem}
          </div>
        </div>
      )}

      {/* Category Breakdown & Hotspots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Grievances by Category
          </h3>
          <div className="space-y-3 text-xs">
            {(data?.categoryStats || []).map((cat: any) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>{cat.category.replace('_', ' ')}</span>
                  <span>{cat.count} issues</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${Math.min((cat.count / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Status Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(data?.statusStats || []).map((st: any) => (
              <div
                key={st.status}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
              >
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  {st.status.replace('_', ' ')}
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white">{st.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
