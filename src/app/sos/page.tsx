'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Clock,
  CheckCircle2,
  MapPin,
  User,
  Radio,
  Share2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function SOSDashboardPage() {
  const { t, speak } = useTranslation();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/sos');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats(data.stats || null);
      }
    } catch {}
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
    fetchAlerts();

    // Listen for live SOS SSE updates
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('sos_alert', () => fetchAlerts());
    eventSource.addEventListener('sos_updated', () => fetchAlerts());

    return () => eventSource.close();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          responseTimeMinutes: newStatus === 'RESOLVED' ? 6 : 2,
        }),
      });

      if (res.ok) {
        speak(`SOS alert updated to ${newStatus}.`);
        fetchAlerts();
      }
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600 animate-pulse" />
            <span>Emergency SOS Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Live emergency tracking for Sarpanch, Women Safety Volunteers, and First Responders
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500 shadow-sm">
          <span className="text-xs font-black uppercase text-red-600">Active Emergencies</span>
          <div className="text-4xl font-black text-red-700 mt-1">
            {stats?.activeCount || 0}
          </div>
          <p className="text-[11px] text-red-600 font-medium mt-1">Requiring immediate volunteer response</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-500">Average Response Time</span>
          <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">
            {stats?.avgResponseTimeMinutes || 6} <span className="text-sm font-bold text-slate-500">minutes</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">From trigger to on-site volunteer arrival</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-500">Total Alerts Handled</span>
          <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">
            {stats?.totalAlerts || alerts.length}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">With 100% volunteer outreach</p>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Emergency Incident Feed</h2>

        <div className="space-y-3">
          {alerts.map((alert) => {
            const isActive = alert.status === 'ACTIVE';
            const isAck = alert.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-3xl border-2 transition-all shadow-sm ${
                  isActive
                    ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 ring-2 ring-red-400/30'
                    : isAck
                    ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isActive
                          ? 'bg-red-600 text-white animate-pulse'
                          : isAck
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      {alert.status}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {alert.senderName}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">({alert.senderPhone})</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium mb-3">
                  {alert.message}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <a
                      href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-green-700 font-bold"
                    >
                      Location: {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)} (Open Map)
                    </a>
                  </div>

                  {/* Incident Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        Acknowledge & Dispatch
                      </button>
                    )}

                    {(isActive || isAck) && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                        className="px-4 py-1.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs shadow"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
