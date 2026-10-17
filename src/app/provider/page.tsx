'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Truck,
  PhoneCall,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw,
  PlusCircle,
  X,
  Check,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

function ProviderDashboardContent() {
  const { t, speak } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProviderData = async () => {
    setLoading(true);
    try {
      const [reqRes, resRes] = await Promise.all([
        fetch('/api/resources/requests'),
        fetch('/api/resources'),
      ]);

      if (reqRes.ok) {
        const d = await reqRes.json();
        setRequests(d.requests || []);
      }
      if (resRes.ok) {
        const d = await resRes.json();
        setResources(d.resources || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PROVIDER' }),
    }).then(() => {
      fetchProviderData();
    });
  }, []);

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/resources/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        speak(`Request marked as ${status}`);
        fetchProviderData();
      }
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-emerald-200 text-xs font-black backdrop-blur-sm">
            <Wrench className="w-3.5 h-3.5 text-emerald-300" />
            <span>सेवा प्रदाता व संसाधन दालन • Service Provider Stream</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Service Provider & Resource Person Center
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-2xl">
            Tractor owners, electricians, plumbers, drivers, and village volunteers. Receive matched community requests, accept tasks, and earn community trust ratings.
          </p>
        </div>

        <button
          onClick={fetchProviderData}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Main Content: Matched Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Incoming Matched Village Requests ({requests.length})
          </h2>
          <Link
            href="/resources"
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Manage Equipment & Listings →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading incoming requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-white">
              No Pending Requests
            </h3>
            <p className="text-xs text-slate-500">
              You will be notified in real-time when a villager requests equipment or services in your category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                      {req.category}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'ACCEPTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {req.description}
                  </p>

                  <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                    <div>Required Date: {new Date(req.neededAt).toLocaleDateString()}</div>
                    <div>Location: {req.location || 'Shivapur Village'}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'ACCEPTED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow"
                      >
                        Accept Task
                      </button>
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'DECLINED')}
                        className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {req.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateRequestStatus(req.id, 'COMPLETED')}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Task Completed</span>
                    </button>
                  )}

                  {req.status === 'COMPLETED' && (
                    <div className="w-full text-center py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ✓ Service Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Provider Portal...</div>}>
      <ProviderDashboardContent />
    </Suspense>
  );
}
