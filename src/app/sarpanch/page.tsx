'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  FileText,
  AlertTriangle,
  Clock,
  Building,
  CheckCircle2,
  Users,
  Send,
  PlusCircle,
  Filter,
  Search,
  ArrowRight,
  Eye,
  Check,
  X,
  Volume2,
  PhoneCall,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  Activity,
  AlertOctagon,
  Pin,
  Megaphone,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// All departments mapped to their roles & categories
const VILLAGE_DEPARTMENTS = [
  { id: 'JAL_SHAKTI', name: 'Jal Shakti (Water Supply Department)', category: 'WATER', icon: '💧' },
  { id: 'MSEDCL_ELECTRICITY', name: 'MSEDCL (Electricity & Power Board)', category: 'ELECTRICITY', icon: '⚡' },
  { id: 'PWD_ROADS', name: 'PWD (Roads & Infrastructure)', category: 'ROADS', icon: '🛣️' },
  { id: 'PHC_HEALTH', name: 'PHC (Primary Health Centre)', category: 'HEALTH', icon: '🏥' },
  { id: 'KVK_AGRICULTURE', name: 'KVK (Krishi Vigyan Kendra - Agriculture)', category: 'AGRICULTURE', icon: '🌱' },
  { id: 'PANCHAYAT', name: 'Gram Panchayat Executive Committee', category: 'OTHER', icon: '🏛️' },
];

const RESOLUTION_TIME_OPTIONS = [
  'Within 12 Hours (Emergency)',
  'Within 24 Hours',
  'Within 48 Hours (2 Days)',
  '3 to 5 Days',
  'Within 1 Week',
  'Under Field Inspection (7-10 Days)',
];

function SarpanchDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialComplaintId = searchParams.get('complaintId');
  const { t, speak, language } = useTranslation();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'GRIEVANCES' | 'NOTICES' | 'SOS' | 'DEPTS'>('GRIEVANCES');

  // Grievances State
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Grievance Action Modal State (Push to Org, ETA, Status, Remark)
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [assignedOrg, setAssignedOrg] = useState<string>('JAL_SHAKTI');
  const [resolutionEta, setResolutionEta] = useState<string>('Within 24 Hours');
  const [customEta, setCustomEta] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [sarpanchRemark, setSarpanchRemark] = useState<string>('');
  const [isUpdatingComplaint, setIsUpdatingComplaint] = useState<boolean>(false);

  // Village Notice Board Manager State
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [noticeType, setNoticeType] = useState<string>('ANNOUNCEMENT');
  const [noticeTitleEn, setNoticeTitleEn] = useState<string>('');
  const [noticeBodyEn, setNoticeBodyEn] = useState<string>('');
  const [noticeTitleHi, setNoticeTitleHi] = useState<string>('');
  const [noticeBodyHi, setNoticeBodyHi] = useState<string>('');
  const [noticeTitleMr, setNoticeTitleMr] = useState<string>('');
  const [noticeBodyMr, setNoticeBodyMr] = useState<string>('');
  const [noticePinned, setNoticePinned] = useState<boolean>(false);
  const [isPublishingNotice, setIsPublishingNotice] = useState<boolean>(false);
  const [noticeSuccessMsg, setNoticeSuccessMsg] = useState<string>('');

  // Emergency SOS State
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);

  // Fetch Complaints
  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        const list = data.complaints || [];
        setComplaints(list);

        if (initialComplaintId) {
          const match = list.find((c: any) => c.id === initialComplaintId);
          if (match) {
            openActionModal(match);
          }
        }
      }
    } catch {}
    setLoadingComplaints(false);
  };

  // Fetch Notices
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts?lang=${language}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {}
    setLoadingPosts(false);
  };

  // Fetch SOS Alerts
  const fetchSos = async () => {
    try {
      const res = await fetch('/api/sos');
      if (res.ok) {
        const data = await res.json();
        setSosAlerts(data.alerts || []);
      }
    } catch {}
  };

  useEffect(() => {
    // Ensure active role is Sarpanch in demo mode
    fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'SARPANCH' }),
    }).then(() => {
      fetchComplaints();
      fetchPosts();
      fetchSos();
    });

    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/events');
      evtSource.addEventListener('complaint_created', () => {
        fetchComplaints();
      });
      evtSource.addEventListener('complaint_updated', () => {
        fetchComplaints();
      });
      evtSource.addEventListener('sos_created', () => {
        fetchSos();
      });
    } catch {}

    return () => {
      evtSource?.close();
    };
  }, [language]);

  // Open the solve & assign modal for a specific grievance
  const openActionModal = (complaint: any) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status || 'IN_PROGRESS');
    setAssignedOrg(complaint.assignedOrgType || 'JAL_SHAKTI');

    const factors = complaint.parsedFactors || {};
    if (factors.resolutionEta) {
      if (RESOLUTION_TIME_OPTIONS.includes(factors.resolutionEta)) {
        setResolutionEta(factors.resolutionEta);
        setCustomEta('');
      } else {
        setResolutionEta('CUSTOM');
        setCustomEta(factors.resolutionEta);
      }
    } else {
      setResolutionEta('Within 24 Hours');
      setCustomEta('');
    }

    setSarpanchRemark(factors.sarpanchRemark || '');
    setActionModalOpen(true);
  };

  // Sarpanch Submits Resolution & Push Action
  const handleSaveGrievanceAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdatingComplaint(true);
    const finalEta = resolutionEta === 'CUSTOM' ? customEta : resolutionEta;

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedOrgType: assignedOrg,
          resolutionEta: finalEta,
          sarpanchRemark: sarpanchRemark.trim(),
        }),
      });

      if (res.ok) {
        speak(`Grievance #${selectedComplaint.code} updated. Assigned to ${assignedOrg}. Expected time: ${finalEta}.`);
        setActionModalOpen(false);
        fetchComplaints();
      } else {
        alert('Failed to update grievance');
      }
    } catch {
      alert('Error updating grievance');
    } finally {
      setIsUpdatingComplaint(false);
    }
  };

  // Convert Grievance directly into a public village Notice
  const convertGrievanceToNotice = (complaint: any) => {
    setActionModalOpen(false);
    setActiveTab('NOTICES');
    const finalEta = resolutionEta === 'CUSTOM' ? customEta : resolutionEta;

    setNoticeType('ANNOUNCEMENT');
    setNoticeTitleEn(`Update on ${complaint.title}`);
    setNoticeBodyEn(
      `Panchayat Update regarding ticket #${complaint.code} (${complaint.category}): Assigned to ${assignedOrg}. Expected resolution time is ${finalEta}. ${sarpanchRemark || 'Repair work is in progress.'}`
    );

    setNoticeTitleHi(`सूचना: ${complaint.title} का निराकरण`);
    setNoticeBodyHi(
      `ग्रामपंचायत सूचना: शिकायत #${complaint.code} (${complaint.category}) को ${assignedOrg} को सौंपा गया है। संभावित समाधान समय: ${finalEta}। ${sarpanchRemark || 'कार्य प्रगति पर है।'}`
    );

    setNoticeTitleMr(`सूचना: ${complaint.title} तक्रार निवारण`);
    setNoticeBodyMr(
      `ग्रामपंचायत सूचना: तक्रार #${complaint.code} (${complaint.category}) ${assignedOrg} कडे वर्ग करण्यात आली आहे. अपेक्षित निवारण वेळ: ${finalEta}। ${sarpanchRemark || 'काम सुरू आहे.'}`
    );

    setNoticePinned(true);
  };

  // Sarpanch Publishes Notice
  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishingNotice(true);
    setNoticeSuccessMsg('');

    const title = noticeTitleEn || noticeTitleMr || noticeTitleHi;
    const body = noticeBodyEn || noticeBodyMr || noticeBodyHi;

    if (!title || !body) {
      alert('Please provide notice title and message body.');
      setIsPublishingNotice(false);
      return;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: noticeType,
          title,
          body,
          isPinned: noticePinned,
          translations: {
            en: { title: noticeTitleEn, body: noticeBodyEn },
            hi: { title: noticeTitleHi, body: noticeBodyHi },
            mr: { title: noticeTitleMr, body: noticeBodyMr },
          },
        }),
      });

      if (res.ok) {
        setNoticeSuccessMsg('✅ Notice published! It is now live on the Resident Notice Board.');
        speak('Official notice published to the village notice board.');
        setNoticeTitleEn('');
        setNoticeBodyEn('');
        setNoticeTitleHi('');
        setNoticeBodyHi('');
        setNoticeTitleMr('');
        setNoticeBodyMr('');
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to publish notice');
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setIsPublishingNotice(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const codeMatch = c.code?.toLowerCase().includes(query);
      const titleMatch = c.title?.toLowerCase().includes(query);
      const orgMatch = c.assignedOrgType?.toLowerCase().includes(query);
      return codeMatch || titleMatch || orgMatch;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-amber-200 text-xs font-black backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>सरपंच / ग्रामपंचायत प्रशासन दालन • Shivapur Village</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Sarpanch Administration Command Center
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-2xl">
            Review incoming grievances, assign tickets to village departments, specify estimated resolution times, and broadcast official village notices directly to residents.
          </p>
        </div>

        {/* Live Metrics Quick Badges */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              fetchComplaints();
              fetchPosts();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/village-board"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-extrabold shadow hover:bg-amber-50 transition-all"
            target="_blank"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-700" />
            <span>View Resident Board ↗</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('GRIEVANCES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'GRIEVANCES'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Incoming Grievances</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/10 text-[11px] font-bold">
            {complaints.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'NOTICES'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Update Notice Board</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/10 text-[11px] font-bold">
            {posts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SOS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'SOS'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-red-500" />
          <span>SOS Alerts</span>
          {sosAlerts.filter((s) => s.status === 'ACTIVE').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-red-700 text-[11px] font-black animate-pulse">
              {sosAlerts.filter((s) => s.status === 'ACTIVE').length} NEW
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DEPTS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'DEPTS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Village Departments</span>
        </button>
      </div>

      {/* 3. TAB 1: INCOMING GRIEVANCES STREAM */}
      {activeTab === 'GRIEVANCES' && (
        <div className="space-y-5 animate-in fade-in-50">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket code, problem, or dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Status & Category Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Pending / Submitted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ASSIGNED">Assigned to Org</option>
                <option value="RESOLVED">Resolved (Solved)</option>
                <option value="CLOSED">Closed</option>
                <option value="ESCALATED">Escalated</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="WATER">Water Supply (पाणी)</option>
                <option value="ELECTRICITY">Electricity (वीज)</option>
                <option value="ROADS">Roads & Transport (रस्ते)</option>
                <option value="HEALTH">Health (आरोग्य)</option>
                <option value="AGRICULTURE">Agriculture (शेती)</option>
                <option value="SANITATION">Sanitation (स्वच्छता)</option>
                <option value="WOMEN_SAFETY">Women Safety (सुरक्षा)</option>
                <option value="OTHER">Other Issues</option>
              </select>
            </div>
          </div>

          {/* Grievances List */}
          {loadingComplaints ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
              <span>Loading resident grievances...</span>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                No Grievances Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No grievances match your current filter. When residents file issues from the portal, they will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComplaints.map((c) => {
                const factors = c.parsedFactors || {};
                const isResolved = c.status === 'RESOLVED' || c.status === 'CLOSED';

                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            #{c.code}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200">
                            {c.category}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              c.priorityBand === 'CRITICAL'
                                ? 'bg-red-100 text-red-800'
                                : c.priorityBand === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {c.priorityBand}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                          {c.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                          {c.description}
                        </p>
                      </div>

                      {/* Location & Resident */}
                      <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.address || 'Shivapur Village'}</span>
                        </div>
                        {c.resident && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Complainant: {c.resident.name} ({c.resident.phone || 'Resident'})</span>
                          </div>
                        )}
                      </div>

                      {/* Department & Resolution Time Callout */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-500">Assigned Department:</span>
                          <span className="text-blue-700 dark:text-blue-300">
                            {c.assignedOrgType || 'Not Assigned Yet'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-500">Expected Resolution:</span>
                          <span className="text-amber-700 dark:text-amber-300">
                            {factors.resolutionEta || 'Pending Sarpanch review'}
                          </span>
                        </div>

                        {factors.sarpanchRemark && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                            <strong>Sarpanch Note: </strong>
                            {factors.sarpanchRemark}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button: Solve Problem Statement */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openActionModal(c)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Manage & Solve Grievance</span>
                      </button>

                      <button
                        onClick={() => convertGrievanceToNotice(c)}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                        title="Broadcast as notice to all villagers"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: UPDATE NOTICE BOARD */}
      {activeTab === 'NOTICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-50">
          {/* Notice Form (2 columns) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                Official Village Notice Publishing
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Publish or Update Village Notice
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                When you post or update a notice here, it automatically appears on the <strong>Resident Notice Board (`/village-board`)</strong> and the top alert ticker in real-time.
              </p>
            </div>

            {noticeSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2">
                <span>{noticeSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handlePublishNotice} className="space-y-4">
              {/* Notice Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400">
                  Notice Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ANNOUNCEMENT', label: '📢 Announcement' },
                    { id: 'EMERGENCY', label: '🚨 Emergency Alert' },
                    { id: 'SCHEDULE', label: '💧 Water / Power Schedule' },
                    { id: 'CAMP', label: '🏥 Health Camp' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNoticeType(t.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                        noticeType === t.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multilingual Notice Inputs */}
              <div className="space-y-3 pt-2">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>🇬🇧 English Notice</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Notice Title (English)"
                    value={noticeTitleEn}
                    onChange={(e) => setNoticeTitleEn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="Notice Body & Details (English)..."
                    value={noticeBodyEn}
                    onChange={(e) => setNoticeBodyEn(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>🇮🇳 मराठी सूचना (Marathi)</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="सूचनेचे शीर्षक (मराठी)"
                    value={noticeTitleMr}
                    onChange={(e) => setNoticeTitleMr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="सूचनेचा तपशील (उदा. उद्या सकाळी ९ वाजता पाणी पुरवठा बंद राहील...)"
                    value={noticeBodyMr}
                    onChange={(e) => setNoticeBodyMr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>🇮🇳 हिंदी सूचना (Hindi)</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="सूचना का शीर्षक (हिंदी)"
                    value={noticeTitleHi}
                    onChange={(e) => setNoticeTitleHi(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="सूचना का विवरण (हिंदी)..."
                    value={noticeBodyHi}
                    onChange={(e) => setNoticeBodyHi(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Pin checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={noticePinned}
                  onChange={(e) => setNoticePinned(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <label htmlFor="pinNotice" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Pin to top of resident notice board (महत्त्वाची सूचना - शीर्षस्थानी ठेवा)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPublishingNotice}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishingNotice ? 'Publishing Notice...' : 'Publish Official Village Notice'}</span>
              </button>
            </form>
          </div>

          {/* Active Notices Feed on Right */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Active Notices on Board
              </h3>
              <span className="text-xs font-bold text-amber-600">
                {posts.length} Live
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        post.type === 'EMERGENCY'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {post.type}
                    </span>
                    {post.isPinned && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {post.displayTitle || post.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {post.displayBody || post.body}
                  </p>

                  <div className="text-[10px] text-slate-400 pt-1">
                    Published: {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: EMERGENCY SOS MONITOR */}
      {activeTab === 'SOS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                Women's Safety & Emergency Dispatch
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Live SOS Alerts
              </h2>
            </div>
            <button
              onClick={fetchSos}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {sosAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold">No active SOS alerts in Shivapur Village.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sosAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl border-2 border-red-500/40 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded">
                        {alert.status}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {alert.senderName || 'Anonymous Villager'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Message: {alert.message || 'Emergency assistance requested!'}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      Location: {alert.lat?.toFixed(4)}, {alert.lng?.toFixed(4)} • Phone: {alert.senderPhone || 'Protected'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {alert.senderPhone && (
                      <a
                        href={`tel:${alert.senderPhone}`}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs shadow flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                    <button
                      onClick={async () => {
                        await fetch(`/api/sos/${alert.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'RESOLVED' }),
                        });
                        fetchSos();
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-extrabold text-xs shadow"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: VILLAGE DEPARTMENTS */}
      {activeTab === 'DEPTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in-50">
          {VILLAGE_DEPARTMENTS.map((dept) => {
            const count = complaints.filter((c) => c.assignedOrgType === dept.id).length;
            const resolvedCount = complaints.filter(
              (c) => c.assignedOrgType === dept.id && (c.status === 'RESOLVED' || c.status === 'CLOSED')
            ).length;

            return (
              <div
                key={dept.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{dept.icon}</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {count} Tickets
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Primary category: <strong>{dept.category}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Resolved:</span>
                  <span className="font-bold text-emerald-600">
                    {resolvedCount} / {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. MODAL: MANAGE & SOLVE GRIEVANCE (Push to Org, Set ETA, Update Status) */}
      {actionModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border-2 border-amber-500 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
                  Grievance Resolution & Routing
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Solve Problem #{selectedComplaint.code}
                </h3>
              </div>
              <button
                onClick={() => setActionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complaint Summary Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {selectedComplaint.title}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {selectedComplaint.description}
              </p>
              <div className="flex items-center gap-3 text-slate-500 pt-1 text-[11px]">
                <span>Category: <strong>{selectedComplaint.category}</strong></span>
                <span>•</span>
                <span>Priority: <strong>{selectedComplaint.priorityBand}</strong></span>
                <span>•</span>
                <span>Location: {selectedComplaint.address || 'Shivapur'}</span>
              </div>
            </div>

            {/* Action Form */}
            <form onSubmit={handleSaveGrievanceAction} className="space-y-4">
              {/* 1. Push to Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Push / Assign to Responsible Department (विभाग निवडा)</span>
                </label>
                <select
                  value={assignedOrg}
                  onChange={(e) => setAssignedOrg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {VILLAGE_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Set Resolution ETA */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. How much time will it take to solve? (निवारणाचा अपेक्षित कालावधी)</span>
                </label>
                <select
                  value={resolutionEta}
                  onChange={(e) => setResolutionEta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {RESOLUTION_TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      ⏱️ {opt}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Estimated Time...</option>
                </select>

                {resolutionEta === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="e.g., In 36 hours after pipeline arrives"
                    value={customEta}
                    onChange={(e) => setCustomEta(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none"
                    required
                  />
                )}
              </div>

              {/* 3. Mention Status (Solved or In Progress) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Mention Grievance Status (सद्य स्थिती)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'IN_PROGRESS', label: 'In Progress' },
                    { id: 'ASSIGNED', label: 'Assigned' },
                    { id: 'RESOLVED', label: 'Solved (Resolved)' },
                    { id: 'CLOSED', label: 'Closed' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setNewStatus(s.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                        newStatus === s.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Sarpanch Instructions / Remark */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                  4. Sarpanch Official Note / Instructions (ग्रामस्थांसाठी व विभागासाठी टीप)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Work order issued to Jal Shakti team. Repair vehicle has left for Zone A."
                  value={sarpanchRemark}
                  onChange={(e) => setSarpanchRemark(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions Bottom Bar */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => convertGrievanceToNotice(selectedComplaint)}
                  className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Broadcast Notice</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingComplaint}
                    className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                  >
                    {isUpdatingComplaint ? 'Saving...' : 'Save & Update Grievance'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SarpanchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Sarpanch Command Center...</div>}>
      <SarpanchDashboardContent />
    </Suspense>
  );
}
