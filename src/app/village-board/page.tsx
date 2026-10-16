'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  AlertTriangle,
  PlusCircle,
  Volume2,
  Calendar,
  Clock,
  Pin,
  ShieldAlert,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function VillageBoardPage() {
  const { t, speak, language } = useTranslation();
  const [posts, setPosts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newPostModalOpen, setNewPostModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Post Form State (Sarpanch only)
  const [postType, setPostType] = useState<string>('ANNOUNCEMENT');
  const [titleEn, setTitleEn] = useState<string>('');
  const [bodyEn, setBodyEn] = useState<string>('');
  const [titleHi, setTitleHi] = useState<string>('');
  const [bodyHi, setBodyHi] = useState<string>('');
  const [titleMr, setTitleMr] = useState<string>('');
  const [bodyMr, setBodyMr] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [targetZone, setTargetZone] = useState<string>('');

  const fetchPosts = async () => {
    try {
      const url = new URL('/api/posts', window.location.origin);
      if (filterType !== 'ALL') url.searchParams.set('type', filterType);
      url.searchParams.set('lang', language);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
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
    fetchPosts();
  }, [filterType, language]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      type: postType,
      title: titleEn || titleMr || titleHi,
      body: bodyEn || bodyMr || bodyHi,
      isPinned,
      targetZone: targetZone || null,
      translations: {
        en: { title: titleEn, body: bodyEn },
        hi: { title: titleHi, body: bodyHi },
        mr: { title: titleMr, body: bodyMr },
      },
    };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewPostModalOpen(false);
        setTitleEn('');
        setBodyEn('');
        setTitleHi('');
        setBodyHi('');
        setTitleMr('');
        setBodyMr('');
        fetchPosts();
        speak('Official village notice published and broadcast to all residents.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to publish post');
      }
    } catch {
      alert('Error publishing post');
    } finally {
      setSubmitting(false);
    }
  };

  const types = [
    { key: 'ALL', label: t('board.all') },
    { key: 'EMERGENCY', label: 'Emergency Alerts' },
    { key: 'ANNOUNCEMENT', label: 'Announcements' },
    { key: 'SCHEME', label: t('board.schemes') },
    { key: 'CAMP', label: t('board.healthCamps') },
    { key: 'SCHEDULE', label: t('board.schedules') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t('board.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Official village resolutions, emergency warnings, and public health camp schedules
          </p>
        </div>

        {currentUser?.role === 'SARPANCH' && (
          <button
            onClick={() => setNewPostModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs shadow-lg shadow-green-700/25 active:scale-95 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('board.createPost')}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {types.map((tp) => (
          <button
            key={tp.key}
            onClick={() => setFilterType(tp.key)}
            className={`px-3.5 py-2 rounded-xl border whitespace-nowrap transition-colors ${
              filterType === tp.key
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* Posts Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post) => {
          const isEmergency = post.type === 'EMERGENCY';
          return (
            <div
              key={post.id}
              className={`rounded-3xl p-6 border-2 transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                isEmergency
                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {post.isPinned && (
                      <span className="p-1 rounded-md bg-amber-100 text-amber-800" title="Pinned Notice">
                        <Pin className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isEmergency
                          ? 'bg-red-600 text-white'
                          : post.type === 'CAMP'
                          ? 'bg-blue-100 text-blue-800'
                          : post.type === 'SCHEME'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {post.type}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  {post.displayTitle}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {post.displayBody}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">
                  {post.author.name} ({post.author.role})
                </span>
                <button
                  onClick={() => speak(`${post.displayTitle}. ${post.displayBody}`)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  title="Read aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sarpanch New Post Modal with Multi-Language Inputs */}
      {newPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Publish Official Village Notice
              </h3>
              <button onClick={() => setNewPostModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-500 uppercase">Notice Type</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="EMERGENCY">Emergency Village Alert (Red)</option>
                    <option value="CAMP">Health / Diagnostic Camp</option>
                    <option value="SCHEME">Government Scheme</option>
                    <option value="SCHEDULE">Bus & Service Schedule</option>
                  </select>
                </div>

                <div className="flex items-center pt-5 gap-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-green-600"
                  />
                  <label htmlFor="pinned" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pin to Top
                  </label>
                </div>
              </div>

              {/* Multi-language inputs */}
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border space-y-2">
                  <span className="text-[11px] font-black uppercase text-green-700">English Notice</span>
                  <input
                    type="text"
                    placeholder="Title in English"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    required
                  />
                  <textarea
                    rows={2}
                    placeholder="Body in English"
                    value={bodyEn}
                    onChange={(e) => setBodyEn(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-700">मराठी भाषांतर (Marathi)</span>
                  <input
                    type="text"
                    placeholder="मराठीत शीर्षक"
                    value={titleMr}
                    onChange={(e) => setTitleMr(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                  />
                  <textarea
                    rows={2}
                    placeholder="मराठीत सविस्तर माहिती"
                    value={bodyMr}
                    onChange={(e) => setBodyMr(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border space-y-2">
                  <span className="text-[11px] font-black uppercase text-blue-700">हिन्दी अनुवाद (Hindi)</span>
                  <input
                    type="text"
                    placeholder="हिन्दी में शीर्षक"
                    value={titleHi}
                    onChange={(e) => setTitleHi(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                  />
                  <textarea
                    rows={2}
                    placeholder="हिन्दी में विवरण"
                    value={bodyHi}
                    onChange={(e) => setBodyHi(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewPostModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-xs font-extrabold shadow"
                >
                  {submitting ? 'Publishing...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
