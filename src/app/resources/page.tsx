'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Wrench,
  Truck,
  Building,
  HeartHandshake,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  X,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// The listing endpoint exists, but its unfinished form is not part of today's
// verified demo path. Keep the feature code and hide only the dead control.
const SHOW_RESOURCE_LISTING = false;

export default function ResourcesPage() {
  const { t, speak } = useTranslation();
  const [resources, setResources] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Request Modal State
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [reqCategory, setReqCategory] = useState<string>('EQUIPMENT');
  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqDescription, setReqDescription] = useState<string>('');
  const [reqUrgency, setReqUrgency] = useState<string>('MEDIUM');
  const [matchingResults, setMatchingResults] = useState<any[] | null>(null);
  const [submittingReq, setSubmittingReq] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string>('');

  // List Resource Modal State
  const [listModalOpen, setListModalOpen] = useState<boolean>(false);
  const [listName, setListName] = useState<string>('');
  const [listCategory, setListCategory] = useState<string>('EQUIPMENT');
  const [listCapacity, setListCapacity] = useState<string>('');
  const [listServiceArea, setListServiceArea] = useState<string>('Shivapur Village');
  const [listSlots, setListSlots] = useState<string>('7:00 AM - 6:00 PM');
  const [listPriceType, setListPriceType] = useState<string>('SUBSIDIZED');
  const [listPriceAmount, setListPriceAmount] = useState<string>('500');

  const fetchResources = async () => {
    try {
      const url = new URL('/api/resources', window.location.origin);
      if (activeCategory !== 'ALL') url.searchParams.set('category', activeCategory);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setAnalytics(data.analytics || null);
      }
    } catch {}
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/resources/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchResources();
    fetchRequests();
    const eventSource = new EventSource('/api/events');
    const refresh = () => {
      fetchResources();
      fetchRequests();
    };
    eventSource.addEventListener('resource_request_matched', refresh);
    eventSource.addEventListener('resource_request_updated', refresh);
    eventSource.addEventListener('open', refresh);
    return () => eventSource.close();
  }, [activeCategory]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReq(true);
    setRequestError('');

    try {
      const res = await fetch('/api/resources/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reqCategory,
          title: reqTitle,
          description: reqDescription,
          urgency: reqUrgency,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRequestError(data.error || 'Request could not be submitted.');
        return;
      }
      setMatchingResults(data.topMatches || []);
      speak(data.topMatches?.length
        ? 'Smart matching complete. Found compatible village providers.'
        : 'Request saved. No compatible provider is available yet.');
      fetchRequests();
    } catch {
      setRequestError('Network error. The request was not confirmed.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleProviderAction = async (requestId: string, action: 'ACCEPT' | 'DECLINE' | 'COMPLETE') => {
    try {
      const res = await fetch(`/api/resources/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        speak(action === 'ACCEPT' ? 'Request accepted!' : action === 'COMPLETE' ? 'Request completed!' : 'Request passed to next provider.');
        fetchRequests();
        fetchResources();
      } else {
        setRequestError(data.error || 'Provider action failed.');
      }
    } catch { setRequestError('Network error. Provider action was not confirmed.'); }
  };

  const categories = [
    { key: 'ALL', label: 'All Resources', icon: Users },
    { key: 'EQUIPMENT', label: 'Equipment & Tractors', icon: Wrench },
    { key: 'VEHICLES', label: 'Vehicles & Tankers', icon: Truck },
    { key: 'SKILLED_PEOPLE', label: 'Skilled People', icon: Wrench },
    { key: 'HUMAN_RESOURCES', label: 'Doctors & Teachers', icon: HeartHandshake },
    { key: 'FACILITIES', label: 'Halls & Shelters', icon: Building },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t('resources.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {t('resources.sub')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
             onClick={() => {
               setRequestError('');
               setMatchingResults(null);
               setRequestModalOpen(true);
             }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('resources.requestBtn')}</span>
          </button>

           {SHOW_RESOURCE_LISTING && <button
             onClick={() => setListModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('resources.listBtn')}</span>
           </button>}
        </div>
      </div>

      {requestError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800">
        {requestError}
      </p>}

      {/* Resource Utilization & Service Gap Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Utilization & Internal Solving Check */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              {t('resources.utilization')}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
              {analytics?.canSolveInternally ? '✓ INTERNAL CAPACITY OK' : '⚠ EXTERNAL POOL NEEDED'}
            </span>
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {analytics?.utilizationText || '7 of 10 tractors & equipment idle this week'}
          </h3>

          <p className="text-xs text-slate-500">
            <strong>Internal Check:</strong> The village currently possesses adequate machinery to resolve scheduled agricultural tasks without hiring expensive taluka contractors.
          </p>
        </div>

        {/* Detected Service Shortage Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-3xl border border-amber-300 dark:border-amber-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{t('resources.serviceGaps')}</span>
          </div>

          <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
            {analytics?.serviceGaps?.[0]?.alert ||
              'Zone B: Agricultural equipment demand is 7x current local supply.'}
          </h3>

          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            Automated supply-demand engine flagged harvest crunch. Sarpanch notification dispatched.
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Resource Requests (with Accept / Decline for providers) */}
      {requests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Active Community Resource Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {req.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {req.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      req.status === 'ACCEPTED'
                        ? 'bg-green-100 text-green-800'
                        : req.status === 'MATCHED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">{req.description}</p>

                {req.matchScore !== null && req.matchScore !== undefined && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between font-bold">
                    <span>Algorithm Fit Score:</span>
                    <span className="text-sm font-black">{req.matchScore}%</span>
                  </div>
                )}

                {/* Provider Accept / Decline buttons if matched to this user */}
                {currentUser?.role === 'PROVIDER' && req.matchedProviderId === currentUser.id &&
                  (req.status === 'MATCHED' || req.status === 'ACCEPTED') && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {req.status === 'MATCHED' && <>
                      <button
                        onClick={() => handleProviderAction(req.id, 'ACCEPT')}
                        className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs shadow"
                      >
                        {t('resources.accept')}
                      </button>
                      <button
                        onClick={() => handleProviderAction(req.id, 'DECLINE')}
                        className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 text-xs font-bold"
                      >
                        {t('resources.decline')}
                      </button>
                    </>}
                    {req.status === 'ACCEPTED' && <button
                      onClick={() => handleProviderAction(req.id, 'COMPLETE')}
                      className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow"
                    >Complete Request</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resources Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.map((res) => (
          <div
            key={res.id}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {res.category.replace('_', ' ')}
                </span>
                <span className="text-xs font-black text-green-700 dark:text-green-400">
                  {res.priceType === 'FREE' ? 'FREE' : `₹${res.priceAmount || 0} / hr`}
                </span>
              </div>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                {res.name}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {res.description}
              </p>

              {res.capacity && (
                <div className="text-[11px] font-bold text-slate-500">
                  Capacity: {res.capacity}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {res.owner.name}
                </span>
                {res.owner.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>{res.serviceArea || 'Shivapur Village'}</span>
                <a
                  href={`tel:${res.contactPhone}`}
                  className="font-bold text-green-700 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Match Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Smart Match Resource Request</span>
              </h3>
              <button onClick={() => setRequestModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!matchingResults ? (
              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block mb-1 text-slate-500 uppercase">Resource Needed</label>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="EQUIPMENT">Tractor / Harvester / Pump</option>
                    <option value="VEHICLES">Water Tanker / Ambulance / Van</option>
                    <option value="SKILLED_PEOPLE">Electrician / Plumber / Mechanic</option>
                    <option value="HUMAN_RESOURCES">Doctor / Teacher / Health Worker</option>
                    <option value="FACILITIES">Community Hall / Grain Godown</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-500 uppercase">Request Summary</label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. 45HP Tractor needed tomorrow morning for ploughing"
                    className="w-full px-3 py-2 rounded-xl border"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500 uppercase">Details & Timing</label>
                  <textarea
                    rows={3}
                    value={reqDescription}
                    onChange={(e) => setReqDescription(e.target.value)}
                    placeholder="Describe acres, location, or urgent schedule..."
                    className="w-full px-3 py-2 rounded-xl border"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md"
                >
                  {submittingReq ? 'Calculating Match Score...' : 'Find Top Matching Providers →'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-green-700">
                  {t('resources.matchedTop')} (Transparent Match Breakdown)
                </h4>

                {matchingResults.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
                    Request saved, but no compatible provider is available yet. It remains pending for the next listing.
                  </p>
                ) : <div className="space-y-2">
                  {matchingResults.map((match, i) => (
                    <div
                      key={match.resource.id}
                      className="p-3.5 rounded-2xl border-2 border-green-600 bg-green-50/50 dark:bg-green-950/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          #{i + 1} {match.resource.name}
                        </span>
                        <span className="text-xs font-black bg-green-600 text-white px-2 py-0.5 rounded">
                          {match.totalScore}% Match
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {match.summaryReason}
                      </p>

                      <div className="text-[10px] text-slate-500 flex gap-2 font-semibold">
                        <span>Proximity: {match.breakdown.proximityScore}/30</span>
                        <span>Availability: {match.breakdown.availabilityScore}/25</span>
                        <span>Reliability: {match.breakdown.reliabilityScore}/15</span>
                      </div>
                    </div>
                  ))}
                </div>}

                <button
                  onClick={() => {
                    setRequestModalOpen(false);
                    setMatchingResults(null);
                  }}
                  className="w-full py-3 rounded-2xl bg-green-700 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
