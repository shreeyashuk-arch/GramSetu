'use client';

import React, { useState } from 'react';
import { ShieldCheck, Trash2, CheckCircle2, Lock, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function PrivacyPage() {
  const router = useRouter();
  const { t, speak } = useTranslation();
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deletedSuccess, setDeletedSuccess] = useState<boolean>(false);

  const handleDeleteData = async () => {
    if (!confirm('Are you sure you want to permanently delete your account and erase personal data under the DPDP Act?')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete-data', { method: 'POST' });
      if (res.ok) {
        setDeletedSuccess(true);
        speak('Your personal data has been permanently erased.');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      } else {
        alert('Failed to erase data. Please login first.');
      }
    } catch {
      alert('Error communicating with erasure server.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Privacy Policy & DPDP Act Compliance
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Digital Personal Data Protection (DPDP) Act, 2023 - Resident Data Protection Notice
        </p>
      </div>

      {/* DPDP Core Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Data Minimization
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            GramSetu collects only the phone number and coarse locality coordinates strictly necessary for delivering civic grievance redressal and resource coordination.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            PII Masking & Coarse Grid
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Public village map pins are rounded to a 200-meter coarse grid. Resident names are masked on public feeds. Exact locations are visible only to the Sarpanch and assigned technician.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Anonymous Grievance Protections
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sensitive corruption or harassment complaints do not log phone numbers, IP addresses, or device IDs, secured with salted one-way rate hashes.
          </p>
        </div>
      </div>

      {/* Right to Erasure / "Delete My Data" Section */}
      <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-red-600 text-white rounded-2xl shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-red-950 dark:text-red-100">
              Right to Erasure (DPDP Act, 2023 - Section 12)
            </h3>
            <p className="text-xs text-red-800 dark:text-red-300">
              You have the right to request the deletion or anonymization of your personal data held by GramSetu. This action will disassociate your phone number, name, and profile from all historical records.
            </p>
          </div>
        </div>

        {deletedSuccess ? (
          <div className="p-4 bg-green-100 text-green-900 font-bold rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <span>Personal data erased successfully. Redirecting...</span>
          </div>
        ) : (
          <button
            onClick={handleDeleteData}
            disabled={deleting}
            className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow flex items-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Erasing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Permanently Delete My Data
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
