'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ThumbsUp,
  Camera,
  Star,
  ArrowRight,
  ShieldAlert,
  Volume2,
  X,
  FileCheck,
  User,
  Building,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import confetti from 'canvas-confetti';

function TrackComplaintsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const { t, speak } = useTranslation();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [onlyMy, setOnlyMy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Resolution confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [feedbackRemarks, setFeedbackRemarks] = useState<string>('');

  // Provider proof upload state
  const [proofModalOpen, setProofModalOpen] = useState<boolean>(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('');

  const fetchComplaints = async () => {
    try {
      const url = new URL('/api/complaints', window.location.origin);
      if (filterCategory !== 'ALL') url.searchParams.set('category', filterCategory);
      if (filterStatus !== 'ALL') url.searchParams.set('status', filterStatus);
      if (onlyMy) url.searchParams.set('my', 'true');

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);

        if (initialId && !selectedComplaint) {
          const match = (data.complaints || []).find((c: any) => c.id === initialId);
          if (match) setSelectedComplaint(match);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [filterCategory, filterStatus, onlyMy]);

  const supportComplaint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/complaints/${id}/support`, { method: 'POST' });
      if (res.ok) {
        fetchComplaints();
        speak('Added as supporter for this village issue.');
      }
    } catch {}
  };

  const handleResidentConfirmation = async (isFixed: boolean) => {
    if (!selectedComplaint) return;
    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentConfirmed: isFixed,
          residentRating: isFixed ? rating : 1,
          residentFeedback: feedbackRemarks,
        }),
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        if (isFixed) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          speak('Thank you for confirming the resolution.');
        } else {
          speak('Issue reopened and escalated to senior authorities.');
        }
        fetchComplaints();
        setSelectedComplaint(null);
      }
    } catch {}
  };

  const handleProviderUploadProof = async () => {
    if (!selectedComplaint || !proofPhotoUrl.trim()) {
      alert('Please enter proof photograph URL.');
      return;
    }

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          proofPhotoUrl,
        }),
      });

      if (res.ok) {
        setProofModalOpen(false);
        setProofPhotoUrl('');
        speak('Resolution proof submitted. Awaiting resident confirmation.');
        fetchComplaints();
        setSelectedComplaint(null);
      }
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Grievance Redressal & Timeline Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time status updates, SLA countdowns, and resident verification with photo proof
          </p>
        </div>

        {currentUser?.role === 'RESIDENT' && (
          <button
            onClick={() => setOnlyMy(!onlyMy)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              onlyMy
                ? 'bg-green-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            {onlyMy ? 'Showing My Reports' : 'Show Only My Reports'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {['ALL', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(
          (st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl border transition-colors ${
                filterStatus === st
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {/* Main Grid: List on Left, Detail Modal on Right / Expand */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints Cards List */}
        <div className="lg:col-span-2 space-y-3">
          {complaints.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 font-semibold border border-slate-200 dark:border-slate-800">
              No grievances found matching the selected filters.
            </div>
          ) : (
            complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm ${
                    isSelected
                      ? 'border-green-600 ring-2 ring-green-600/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        #{c.code}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.category}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          c.priorityBand === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : c.priorityBand === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {c.priorityBand} ({c.priorityScore})
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                        c.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'ESCALATED'
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mb-1">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span>{c.address}</span>
                      {c.assignedOrgType && (
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          • {c.assignedOrgType}
                        </span>
                      )}
                    </div>

                    {/* "+1 same problem" supporter button */}
                    <button
                      onClick={(e) => supportComplaint(c.id, e)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-green-50 text-slate-700 dark:text-slate-300 hover:text-green-700 font-bold text-xs"
                      title="I also face this problem"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{c.supporterCount || 0}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Complaint Detail & Timeline View */}
        <div className="lg:col-span-1">
          {selectedComplaint ? (
            <div className="sticky top-20 bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-green-600 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-wider">
                    #{selectedComplaint.code} Detail
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

              {/* Priority Explanation Breakdown */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between font-bold">
                  <span>Priority Reason:</span>
                  <span className="text-green-700 uppercase">{selectedComplaint.priorityBand}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                  {selectedComplaint.priorityFactors
                    ? JSON.parse(selectedComplaint.priorityFactors).explanation
                    : 'Standard severity based on affected households.'}
                </p>
              </div>

              {/* Status Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase text-slate-500">Lifecycle Timeline</h4>
                <div className="space-y-2 text-xs">
                  {['SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(
                    (step, idx) => {
                      const stages = ['SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
                      const currentIdx = stages.indexOf(selectedComplaint.status);
                      const isPast = currentIdx >= idx;
                      const isCurrent = selectedComplaint.status === step;

                      return (
                        <div key={step} className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isCurrent
                                ? 'bg-green-600 text-white ring-2 ring-green-400'
                                : isPast
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {isPast ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`font-semibold ${
                              isCurrent ? 'text-green-700 dark:text-green-400 font-extrabold' : 'text-slate-500'
                            }`}
                          >
                            {step.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Proof Photo Display (if resolved) */}
              {selectedComplaint.proofPhotoUrl && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase text-slate-500 mb-2">
                    Resolution Proof Photo
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-36 bg-slate-100">
                    <img
                      src={selectedComplaint.proofPhotoUrl}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Action 1: Resident Confirmation if RESOLVED */}
              {selectedComplaint.status === 'RESOLVED' && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-2 text-center">
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100">
                    Resident Verification Required: {t('feedback.isFixed')}
                  </h4>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setConfirmModalOpen(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow"
                    >
                      {t('feedback.yesFixed')}
                    </button>
                    <button
                      onClick={() => handleResidentConfirmation(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow"
                    >
                      {t('feedback.noReopen')}
                    </button>
                  </div>
                </div>
              )}

              {/* Action 2: Provider / Org upload proof photo */}
              {(currentUser?.role === 'PROVIDER' || currentUser?.role === 'ORGANIZATION') &&
                selectedComplaint.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => setProofModalOpen(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Upload Proof & Mark Resolved</span>
                  </button>
                )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs font-semibold">
              Select any grievance card on the left to view timeline history, proof photographs, and resolution feedback.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">
              {t('feedback.rateResolution')}
            </h3>

            {/* 1-5 Star Picker */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${star <= rating ? 'fill-current' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={feedbackRemarks}
              onChange={(e) => setFeedbackRemarks(e.target.value)}
              placeholder={t('feedback.feedbackPlaceholder')}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResidentConfirmation(true)}
                className="flex-1 py-2.5 rounded-xl bg-green-700 text-white text-xs font-bold shadow"
              >
                {t('feedback.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Upload Proof Modal */}
      {proofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Upload Resolution Proof Photo
            </h3>
            <p className="text-xs text-slate-500">
              Paste the image URL of the repaired work (e.g. from inspection camera).
            </p>

            <input
              type="url"
              value={proofPhotoUrl}
              onChange={(e) => setProofPhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3 py-2.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setProofModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleProviderUploadProof}
                className="flex-1 py-2.5 rounded-xl bg-green-700 text-white text-xs font-bold shadow"
              >
                Submit Proof
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackComplaintsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-slate-400">Loading complaints...</div>}>
      <TrackComplaintsContent />
    </Suspense>
  );
}
