'use client';

import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AnonymousReportPage() {
  const { t, speak } = useTranslation();

  // Tab: File new anonymous report vs Track existing code
  const [activeTab, setActiveTab] = useState<'file' | 'track'>('file');

  // Form State
  const [category, setCategory] = useState<string>('WOMEN_SAFETY');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSensitive, setIsSensitive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Track Code State
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title,
          description,
          isAnonymous: true,
          urgency: 4,
          peopleAffected: 2,
          lat: 18.3164,
          lng: 73.8682,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedCode(data.trackingCode);
        speak(`Anonymous grievance recorded. Please note your tracking code ${data.trackingCode}.`);
      } else {
        alert(data.error || 'Failed to submit');
      }
    } catch {
      alert('Error submitting anonymous grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;

    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(`/api/complaints/anonymous/${encodeURIComponent(lookupCode.trim())}`);
      const data = await res.json();

      if (res.ok) {
        setLookupResult(data.complaint);
      } else {
        setLookupError(data.error || 'No report found with this code');
      }
    } catch {
      setLookupError('Network error');
    } finally {
      setLookingUp(false);
    }
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-7 h-7 text-green-700" />
            <span>{t('anonymous.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {t('anonymous.sub')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 font-bold text-xs">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-2.5 rounded-xl transition-all ${
            activeTab === 'file'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          File Confidential Report
        </button>
        <button
          onClick={() => setActiveTab('track')}
          className={`flex-1 py-2.5 rounded-xl transition-all ${
            activeTab === 'track'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500'
          }`}
        >
          {t('anonymous.checkStatus')}
        </button>
      </div>

      {activeTab === 'file' ? (
        !generatedCode ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
          >
            <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-200 text-xs text-green-900 dark:text-green-200 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
              <span>
                Zero Personal Data Recorded: Your phone number, IP address, and browser cookies are not stored.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="WOMEN_SAFETY">Women Safety & Harassment</option>
                <option value="OTHER">Corruption / Irregularity</option>
                <option value="SANITATION">Public Sanitation / Illegal Dumping</option>
                <option value="WATER">Water Misuse / Unauthorized Pumping</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Summary of Incident
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary without mentioning names..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Details & Approximate Location
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the grievance clearly..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Privately...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Anonymous Report
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-green-600 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto shadow">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Report Submitted Anonymously
            </h3>

            <p className="text-xs text-slate-500">
              {t('anonymous.saveCode')}
            </p>

            <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl border-2 border-dashed border-slate-300">
              <span className="font-mono text-xl sm:text-2xl font-black text-green-700 tracking-wider">
                {generatedCode}
              </span>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
                title="Copy Code"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setGeneratedCode(null);
                  setTitle('');
                  setDescription('');
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-200 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )
      ) : (
        /* Track Status Tab */
        <div className="space-y-4">
          <form
            onSubmit={handleLookup}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Enter tracking code (e.g. GS-ANON-7829-X)"
              className="flex-1 px-4 py-3 rounded-xl border text-xs font-mono font-bold"
              required
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="px-6 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs shadow flex items-center justify-center gap-1.5"
            >
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Track</span>
            </button>
          </form>

          {lookupError && (
            <div className="bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 text-xs font-bold">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-green-600 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-green-700">
                  #{lookupResult.code}
                </span>
                <span className="text-xs font-black uppercase bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                  {lookupResult.status}
                </span>
              </div>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lookupResult.title}
              </h3>

              <div className="text-xs text-slate-500 font-semibold pt-2 border-t border-slate-100">
                Created on: {new Date(lookupResult.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
