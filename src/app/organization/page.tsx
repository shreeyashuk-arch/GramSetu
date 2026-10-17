'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  Camera,
  MapPin,
  Users,
  AlertTriangle,
  RefreshCw,
  Send,
  X,
  FileCheck,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const ORG_LIST = [
  { id: 'JAL_SHAKTI', name: 'Jal Shakti (Water Supply)', icon: '💧' },
  { id: 'MSEDCL_ELECTRICITY', name: 'MSEDCL (Electricity Board)', icon: '⚡' },
  { id: 'PWD_ROADS', name: 'PWD (Roads & Transport)', icon: '🛣️' },
  { id: 'PHC_HEALTH', name: 'PHC (Health & Sanitation)', icon: '🏥' },
  { id: 'KVK_AGRICULTURE', name: 'KVK (Agriculture)', icon: '🌱' },
  { id: 'PANCHAYAT', name: 'Gram Panchayat Committee', icon: '🏛️' },
];

function OrganizationDashboardContent() {
  const searchParams = useSearchParams();
  const initialComplaintId = searchParams.get('complaintId');
  const { t, speak } = useTranslation();

  const [activeOrg, setActiveOrg] = useState<string>('JAL_SHAKTI');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Resolution modal state
  const [resolveModalOpen, setResolveModalOpen] = useState<boolean>(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('');
  const [orgNotes, setOrgNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchOrgComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        const all = data.complaints || [];
        setComplaints(all);

        if (initialComplaintId) {
          const match = all.find((c: any) => c.id === initialComplaintId);
          if (match) setSelectedComplaint(match);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ORGANIZATION' }),
    }).then(() => {
      fetchOrgComplaints();
    });
  }, [activeOrg]);

  // Filter complaints assigned to this department
  const orgComplaints = complaints.filter(
    (c) => c.assignedOrgType === activeOrg || (!c.assignedOrgType && activeOrg === 'JAL_SHAKTI')
  );

  const handleUpdateStatus = async (complaintId: string, status: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        speak(`Status changed to ${status}`);
        fetchOrgComplaints();
        if (selectedComplaint?.id === complaintId) {
          setSelectedComplaint((prev: any) => ({ ...prev, status }));
        }
      }
    } catch {}
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          proofPhotoUrl: proofPhotoUrl || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800',
          sarpanchRemark: orgNotes ? `Dept Note: ${orgNotes}` : undefined,
        }),
      });

      if (res.ok) {
        speak('Work marked as resolved and resolution proof uploaded.');
        setResolveModalOpen(false);
        setProofPhotoUrl('');
        setOrgNotes('');
        fetchOrgComplaints();
        setSelectedComplaint(null);
      }
    } catch {
      alert('Error saving resolution');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-blue-200 text-xs font-black backdrop-blur-sm">
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>शासकीय विभाग व संस्था दालन • Department Stream</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Organization & Department Workspace
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 font-medium max-w-2xl">
            Receive grievances assigned by the Sarpanch, execute field inspections and repairs, upload resolution proof photos, and update resolution status.
          </p>
        </div>

        <button
          onClick={fetchOrgComplaints}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync Assigned</span>
        </button>
      </div>

      {/* Department Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {ORG_LIST.map((org) => {
          const isCurrent = activeOrg === org.id;
          const count = complaints.filter((c) => c.assignedOrgType === org.id).length;
          return (
            <button
              key={org.id}
              onClick={() => setActiveOrg(org.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>{org.icon}</span>
              <span>{org.name}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Ticket list & Detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Grievances Assigned to {activeOrg} ({orgComplaints.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading department queue...</div>
          ) : orgComplaints.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-base text-slate-800 dark:text-white">
                Queue Clear!
              </h3>
              <p className="text-xs text-slate-500">
                No open tickets currently assigned to {activeOrg}. Sarpanch assignments will show here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orgComplaints.map((c) => {
                const factors = c.parsedFactors || {};
                const isSelected = selectedComplaint?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          #{c.code}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                          {c.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                      {c.description}
                    </p>

                    {/* ETA callout */}
                    {factors.resolutionEta && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Sarpanch Expected Time: {factors.resolutionEta}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Ticket Actions */}
        <div className="lg:col-span-1">
          {selectedComplaint ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 shadow-xl space-y-4 sticky top-20">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-blue-600 uppercase tracking-wider">
                    #{selectedComplaint.code} Action Panel
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {selectedComplaint.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {selectedComplaint.description}
              </p>

              {/* Status Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase text-slate-500">
                  Update Department Work Status
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'ACCEPTED')}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold"
                  >
                    Accept Ticket
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'IN_PROGRESS')}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Start Work
                  </button>
                </div>

                <button
                  onClick={() => setResolveModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow"
                >
                  <Camera className="w-4 h-4" />
                  <span>Upload Proof & Mark Resolved</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs font-semibold">
              Select any grievance card on the left to accept work, update progress, or upload completion proof.
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Mark Grievance #{selectedComplaint.code} as Resolved
            </h3>

            <form onSubmit={handleResolveTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Proof Photo URL (Required by Panchayat resolution rules)
                </label>
                <input
                  type="url"
                  placeholder="https://... (or leave default demo proof image)"
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Resolution Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Pipeline repaired and water supply restored to Zone A."
                  value={orgNotes}
                  onChange={(e) => setOrgNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow"
                >
                  {submitting ? 'Submitting...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Department Portal...</div>}>
      <OrganizationDashboardContent />
    </Suspense>
  );
}
