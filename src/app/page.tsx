'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  Volume2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  PlusCircle,
  MapPin,
  Calendar,
  Users,
  Check,
  Star,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function HomePage() {
  const { t, speak, language } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()).catch(() => ({ user: null })),
      fetch('/api/analytics').then((r) => r.json()).catch(() => ({ summary: null })),
      fetch(`/api/posts?lang=${language}`).then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch('/api/complaints?resolved=true').then((r) => r.json()).catch(() => ({ complaints: [] })),
    ]).then(([authData, analyticsData, postsData, resolvedData]) => {
      setUser(authData.user);
      setStats(analyticsData);
      setPosts(postsData.posts?.slice(0, 3) || []);
      setResolvedIssues(resolvedData.complaints?.slice(0, 3) || []);
      setLoading(false);
    });
  }, [language]);

  const emergencyPosts = posts.filter((p) => p.type === 'EMERGENCY');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 1. Hero Welcome & Quick Action Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-900 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-green-200 text-xs font-bold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Shivapur Gram Panchayat Coordination</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {t('app.name')}
          </h1>

          <p className="text-base sm:text-lg text-green-100 font-medium">
            {t('app.tagline')}
          </p>

          {/* Large touch-friendly primary action buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/report"
              className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 transition-transform active:scale-95"
            >
              <PlusCircle className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              <span>{t('report.title')}</span>
            </Link>

            <Link
              href="/complaints/track"
              className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base backdrop-blur-sm transition-colors border border-white/20"
            >
              <span>Track Grievances</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </section>

      {/* 2. Emergency Notice Callout (if active) */}
      {emergencyPosts.length > 0 && (
        <section className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-3xl p-5 sm:p-6 shadow-md flex items-start gap-4">
          <div className="p-3 bg-red-600 text-white rounded-2xl shrink-0 animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded">
                CRITICAL ALERT
              </span>
              <h3 className="text-base sm:text-lg font-black text-red-900 dark:text-red-200">
                {emergencyPosts[0].displayTitle}
              </h3>
            </div>
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              {emergencyPosts[0].displayBody}
            </p>
          </div>
        </section>
      )}

      {/* 3. Village Service Health & Live Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('analytics.healthIndex')}</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {stats?.summary?.healthIndex || 88}
            </span>
            <span className="text-xs font-bold text-emerald-600">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Village infrastructure uptime score</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('analytics.activeCount')}</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {stats?.summary?.activeComplaints || 42}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Under investigation or in repair</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('analytics.resolvedCount')}</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {stats?.summary?.resolvedComplaints || 18}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed with resident ratings</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('analytics.avgResolutionTime')}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {stats?.summary?.avgResolutionTimeHours || 28}
            </span>
            <span className="text-xs font-bold text-slate-500">hours</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From submission to proof</p>
        </div>
      </section>

      {/* 4. Seasonal Demand Alert Widget */}
      {stats?.seasonalAlert && (
        <section className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                  {stats.seasonalAlert.season}
                </span>
                <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
                  {stats.seasonalAlert.alertTitle}
                </h4>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {stats.seasonalAlert.description}
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200 pt-1">
                Action: {stats.seasonalAlert.actionItem}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Village Notice Board Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('board.title')}
            </h2>
            <p className="text-xs text-slate-500">Official Sarpanch & Panchayat announcements</p>
          </div>
          <Link
            href="/village-board"
            className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    post.type === 'EMERGENCY'
                      ? 'bg-red-100 text-red-800'
                      : post.type === 'CAMP'
                      ? 'bg-blue-100 text-blue-800'
                      : post.type === 'SCHEME'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {post.type}
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                  {post.displayTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {post.displayBody}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>By {post.author.name.split(' ')[0]} (Sarpanch)</span>
                <button
                  onClick={() => speak(`${post.displayTitle}. ${post.displayBody}`)}
                  className="p-1 hover:text-slate-700"
                  title="Read notice aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Public Resolved Feed with Before/After Proof Photos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span>Public Proof of Resolution Feed</span>
            </h2>
            <p className="text-xs text-slate-500">
              Transparent before and after photographs confirmed by resident satisfaction ratings
            </p>
          </div>
          <Link
            href="/complaints/track"
            className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            <span>Track All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resolvedIssues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              {/* Proof Photo Comparison */}
              <div className="relative h-44 bg-slate-200 overflow-hidden">
                {issue.proofPhotoUrl ? (
                  <img
                    src={issue.proofPhotoUrl}
                    alt="Proof of resolution"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Inspection verified
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                  ✓ RESOLVED PROOF
                </div>
              </div>

              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-bold">#{issue.code}</span>
                  <span className="uppercase text-green-700 font-extrabold">{issue.category}</span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                  {issue.title}
                </h3>

                {issue.residentFeedback && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                    "{issue.residentFeedback}"
                  </div>
                )}
              </div>

              <div className="p-4 pt-0 flex items-center justify-between text-xs font-bold border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center text-amber-500">
                  {[...Array(issue.residentRating || 5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{issue.address}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Quick Emergency Dials footer bar */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-amber-400" />
            <span>Village Emergency Helpline Quick Dials</span>
          </h3>
          <p className="text-xs text-slate-400">Toll-free emergency numbers active 24x7 across Maharashtra</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:112"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow"
          >
            112 Emergency
          </a>
          <a
            href="tel:1091"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow"
          >
            1091 Women
          </a>
          <a
            href="tel:108"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
          >
            108 Ambulance
          </a>
          <a
            href="tel:9876543210"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700"
          >
            Sarpanch Office
          </a>
        </div>
      </section>
    </div>
  );
}
