'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  Building2,
  Truck,
  ArrowRight,
  Wifi,
  WifiOff,
  ShieldAlert,
  CheckCircle2,
  Star,
  Mic,
  Camera,
  MapPin,
  Bell,
  Handshake,
  ClipboardList,
  ArrowLeft,
  Globe,
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Back + title */}
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
          How GramSetu Works
        </h1>
        <p className="text-sm text-slate-500 max-w-xl">
          A village digital backbone connecting residents, panchayat, departments, and
          service providers — in English, हिन्दी, or मराठी — even offline.
        </p>
      </div>

      {/* ── Main flow diagram ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
          Core Grievance Flow
        </h2>

        {/* Step row */}
        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {/* Step 1 */}
          <FlowStep
            color="amber"
            icon={<User className="w-6 h-6" />}
            label="Resident"
            sublabel="Any villager"
            details={[
              { icon: <Mic className="w-3.5 h-3.5" />, text: 'Voice or text report' },
              { icon: <Camera className="w-3.5 h-3.5" />, text: 'Upload photo proof' },
              { icon: <MapPin className="w-3.5 h-3.5" />, text: 'Auto GPS location' },
            ]}
          />

          <Arrow />

          {/* Step 2 */}
          <FlowStep
            color="green"
            icon={<Building2 className="w-6 h-6" />}
            label="Sarpanch / Department"
            sublabel="Jal Shakti · MSEDCL · PWD · PHC · KVK"
            details={[
              { icon: <ClipboardList className="w-3.5 h-3.5" />, text: 'Routed by category & zone' },
              { icon: <Bell className="w-3.5 h-3.5" />, text: 'Real-time SSE notifications' },
              { icon: <Star className="w-3.5 h-3.5" />, text: 'Priority score drives SLA' },
            ]}
          />

          <Arrow />

          {/* Step 3 */}
          <FlowStep
            color="violet"
            icon={<Truck className="w-6 h-6" />}
            label="Service Provider"
            sublabel="Tractor · Ambulance · Plumber · Doctor"
            details={[
              { icon: <Handshake className="w-3.5 h-3.5" />, text: 'Smart match by proximity & fit' },
              { icon: <Camera className="w-3.5 h-3.5" />, text: 'Upload resolution proof photo' },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Resident confirms with rating' },
            ]}
          />
        </div>

        {/* Outcome callout */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
              Transparent Resolution with Photo Proof
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Before/after photos confirmed by the resident • Public Resolved Feed builds community trust • 1–5 star rating auto-reopens if unsatisfied
            </p>
          </div>
        </div>
      </section>

      {/* ── Parallel systems ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SideCard
          color="red"
          icon={<ShieldAlert className="w-5 h-5" />}
          title="SOS & Safety"
          items={[
            '2-second hold trigger',
            'Live GPS → Sarpanch + volunteers',
            '112 / 1091 / 108 quick dials',
            'Ambulance request matching',
          ]}
        />
        <SideCard
          color="slate"
          icon={<WifiOff className="w-5 h-5" />}
          title="Offline Sync"
          items={[
            'IndexedDB queues complaints',
            'Service Worker caches app shell',
            'Sync Now on reconnect',
            'Queued SOS clearly labelled "not sent"',
          ]}
        />
        <SideCard
          color="blue"
          icon={<Globe className="w-5 h-5" />}
          title="Multilingual"
          items={[
            'English · हिन्दी · मराठी',
            'Voice read-aloud for low literacy',
            'Sarpanch notices in 3 languages',
            'Language toggle persists in cookie',
          ]}
        />
      </section>

      {/* ── 4 stakeholders ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
          4 Stakeholder Roles
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-left">
                <th className="px-4 py-3 font-black text-slate-700 dark:text-slate-300">Role</th>
                <th className="px-4 py-3 font-black text-slate-700 dark:text-slate-300">Demo Login</th>
                <th className="px-4 py-3 font-black text-slate-700 dark:text-slate-300 hidden sm:table-cell">Key Powers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { role: 'Resident', phone: '9876543250', powers: 'Report, track, confirm resolution, SOS, request resources' },
                { role: 'Sarpanch', phone: '9876543210', powers: 'Full oversight, emergency posts, SOS dashboard, moderation' },
                { role: 'Organization', phone: '9876543220', powers: 'Department queue, accept/reject, upload proof photos' },
                { role: 'Provider', phone: '9876543230', powers: 'Resource listing, accept matched requests, complete jobs' },
              ].map((r) => (
                <tr key={r.role} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{r.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{r.phone}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 hidden sm:table-cell">{r.powers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">
          Use the <strong>1-Click Demo Bar</strong> at the top of every page to switch roles instantly (demo mode only).
        </p>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/report"
          className="px-6 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black text-sm shadow transition-transform active:scale-95"
          id="hiw-report-cta"
        >
          File a Complaint →
        </Link>
        <Link
          href="/resources"
          className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-sm transition-colors"
          id="hiw-resources-cta"
        >
          Browse Resources →
        </Link>
        <Link
          href="/analytics"
          className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-sm transition-colors"
          id="hiw-analytics-cta"
        >
          Village Analytics →
        </Link>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

function FlowStep({
  color,
  icon,
  label,
  sublabel,
  details,
}: {
  color: 'amber' | 'green' | 'violet';
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  details: { icon: React.ReactNode; text: string }[];
}) {
  const palette = {
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
      icon: 'bg-amber-500 text-white',
      label: 'text-amber-900 dark:text-amber-100',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
      icon: 'bg-green-700 text-white',
      label: 'text-green-900 dark:text-green-100',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
      icon: 'bg-violet-600 text-white',
      label: 'text-violet-900 dark:text-violet-100',
    },
  }[color];

  return (
    <div
      className={`flex-1 rounded-3xl border p-5 space-y-3 ${palette.bg}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${palette.icon}`}>
        {icon}
      </div>
      <div>
        <p className={`font-black text-base ${palette.label}`}>{label}</p>
        <p className="text-[11px] text-slate-500 font-medium">{sublabel}</p>
      </div>
      <ul className="space-y-1.5">
        {details.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="text-slate-400">{d.icon}</span>
            {d.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex sm:flex-col items-center justify-center px-1 sm:py-2 sm:px-0">
      {/* Horizontal on desktop, shown as a small separator on mobile */}
      <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 rotate-90 sm:rotate-0" />
    </div>
  );
}

function SideCard({
  color,
  icon,
  title,
  items,
}: {
  color: 'red' | 'slate' | 'blue';
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  const palette = {
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    slate: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  }[color];

  return (
    <div className={`rounded-3xl border p-5 space-y-3 ${palette}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-black text-sm">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
