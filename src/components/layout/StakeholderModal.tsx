'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Shield,
  Building2,
  Wrench,
  ArrowRight,
  Sparkles,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface StakeholderModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function StakeholderModal({ forceOpen = false, onClose }: StakeholderModalProps) {
  const router = useRouter();
  const { t, speak } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    // Check if stakeholder choice was already made
    const saved = localStorage.getItem('gramsetu_stakeholder_chosen');
    if (!saved) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const selectStakeholder = async (role: string, targetPath: string) => {
    setSelectedRole(role);
    setIsSwitching(true);

    try {
      // Set session role via demo-login API
      await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      localStorage.setItem('gramsetu_stakeholder_chosen', role);
      setIsOpen(false);
      if (onClose) onClose();

      if (role === 'SARPANCH') {
        speak('Welcome Sarpanch. Entered village administration portal.');
      } else if (role === 'ORGANIZATION') {
        speak('Welcome Department Officer. Entered organization queue.');
      } else if (role === 'PROVIDER') {
        speak('Welcome Service Provider. Entered resource tasks.');
      } else {
        speak('Welcome resident. Entered citizen portal.');
      }

      router.push(targetPath);
      router.refresh();
    } catch {
      router.push(targetPath);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isOpen) return null;

  const stakeholders = [
    {
      key: 'RESIDENT',
      title: 'Resident (ग्रामस्थ / नागरिक)',
      subtitle: 'Village citizen & community member',
      desc: 'Report problems with voice or text, track grievance status in real-time, view official notice board, village map, and use Women’s SOS safety.',
      icon: UserCheck,
      color: 'from-green-600 to-emerald-700',
      badge: 'Citizen Stream',
      target: '/',
    },
    {
      key: 'SARPANCH',
      title: 'Sarpanch / Village Admin (सरपंच / प्रशासन)',
      subtitle: 'Elected village head & executive',
      desc: 'Review incoming grievances, assign tickets to village departments, specify estimated resolution time (ETA), and broadcast official notices directly to residents.',
      icon: Shield,
      color: 'from-amber-600 to-amber-700',
      badge: 'Admin Stream',
      target: '/sarpanch',
    },
    {
      key: 'ORGANIZATION',
      title: 'Organization / Department (शासकीय विभाग व संस्था)',
      subtitle: 'Jal Shakti, Electricity Board, PWD, Health',
      desc: 'View department-specific tickets assigned by the Sarpanch, execute field work, upload resolution proof photos, and update work progress.',
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      badge: 'Department Stream',
      target: '/organization',
    },
    {
      key: 'PROVIDER',
      title: 'Resource Person / Service Provider (सेवा प्रदाता)',
      subtitle: 'Tractor owner, Electrician, Plumber, Volunteer',
      desc: 'Receive matched village equipment and service requests, accept emergency village tasks, and manage personal resource availability.',
      icon: Wrench,
      color: 'from-teal-600 to-emerald-800',
      badge: 'Provider Stream',
      target: '/provider',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in zoom-in-95 my-auto">
        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ग्रामसेतू • हितधारक दालन निवडा</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Select Your Stakeholder Stream
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Choose which stakeholder you are to enter your dedicated, privacy-protected workspace. You can switch portals anytime from the top bar.
          </p>
        </div>

        {/* Stakeholder 4-Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stakeholders.map((s) => {
            const Icon = s.icon;
            const isChosen = selectedRole === s.key;

            return (
              <button
                key={s.key}
                disabled={isSwitching}
                onClick={() => selectStakeholder(s.key, s.target)}
                className={`group text-left p-5 sm:p-6 rounded-3xl border-2 transition-all relative overflow-hidden flex flex-col justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 ${
                  isChosen
                    ? 'border-amber-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${s.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {s.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {s.title}
                    </h3>
                    <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {s.subtitle}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-black text-slate-900 dark:text-white">
                  <span>Enter {s.badge}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="text-center pt-2">
          {forceOpen && (
            <button
              onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close and remain on current page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
