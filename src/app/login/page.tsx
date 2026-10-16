'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  KeyRound,
  Shield,
  UserCheck,
  Building2,
  Wrench,
  ArrowRight,
  Loader2,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t, speak } = useTranslation();

  const [phone, setPhone] = useState<string>('9876543250');
  const [otp, setOtp] = useState<string>('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (res.ok) {
        setDemoOtp(data.demoOtp);
        setOtp(data.demoOtp); // Auto-fill in demo mode for ultimate evaluation ease
        setStep('OTP');
        speak(`OTP generated in demo mode: ${data.demoOtp}`);
      } else {
        alert(data.error || 'Failed to send OTP');
      }
    } catch {
      alert('Network error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });

      if (res.ok) {
        speak('Logged in successfully.');
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Invalid OTP');
      }
    } catch {
      alert('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickLogin = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        speak(`Logged in as ${role}`);
        router.push('/');
        router.refresh();
      }
    } catch {
      alert('Failed to switch role');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Sign In to GramSetu
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Mobile OTP authentication with 1-click evaluation access for all 4 stakeholder roles
        </p>
      </div>

      {/* Currently Logged In Banner */}
      {currentUser && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
                Currently Logged In
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {currentUser.name} ({currentUser.role})
              </h3>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Card: 1-Click Demo Login for the 4 Stakeholder Roles */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              INSTANT ACCESS
            </span>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              1-Click Demo Login (4 Roles)
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Click any stakeholder below to immediately log in with realistic seed data:
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() => handleOneClickLogin('RESIDENT')}
              disabled={loading}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-600 hover:bg-green-50/50 flex items-center justify-between text-left transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Resident / Villager
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ananda Jadhav (Report issues, SOS, ratings)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleOneClickLogin('SARPANCH')}
              disabled={loading}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-600 hover:bg-green-50/50 flex items-center justify-between text-left transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Sarpanch (Admin)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Balasaheb Patil (Post alerts, SOS dashboard, moderation)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleOneClickLogin('ORGANIZATION')}
              disabled={loading}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-600 hover:bg-green-50/50 flex items-center justify-between text-left transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Jal Shakti Dept (Org)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Water Supply Department (Segregated water queue)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleOneClickLogin('PROVIDER')}
              disabled={loading}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-600 hover:bg-green-50/50 flex items-center justify-between text-left transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Provider / Volunteer
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ramesh Shinde (Tractor owner, matched requests)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Right Card: Phone + OTP Standard Login */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              STANDARD LOGIN
            </span>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Phone & OTP Verification
            </h3>
          </div>

          {demoOtp && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-1">
              <span className="font-black uppercase tracking-wider block">
                DEMO MODE: OTP DISPLAYED ON SCREEN
              </span>
              <div className="font-mono text-xl font-black text-slate-900">
                {demoOtp}
              </div>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543250"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-sm shadow flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP Code →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-mono font-bold tracking-widest"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="flex-1 py-3 rounded-xl bg-slate-200 text-xs font-bold"
                >
                  Change Phone
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs shadow"
                >
                  {loading ? 'Verifying...' : 'Verify & Enter'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
