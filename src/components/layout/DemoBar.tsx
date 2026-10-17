'use client';

import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Building2, Wrench, RefreshCw, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StakeholderModal from './StakeholderModal';

export default function DemoBar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [switching, setSwitching] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const switchRole = async (targetRole: string) => {
    try {
      setSwitching(true);
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });

      if (res.ok) {
        localStorage.setItem('gramsetu_stakeholder_chosen', targetRole);
        await fetchUser();
        if (targetRole === 'SARPANCH') router.push('/sarpanch');
        else if (targetRole === 'ORGANIZATION') router.push('/organization');
        else if (targetRole === 'PROVIDER') router.push('/provider');
        else router.push('/');
        router.refresh();
      }
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setSwitching(false);
    }
  };

  const roles = [
    { key: 'RESIDENT', label: 'Resident', icon: UserCheck, desc: 'Citizen Stream' },
    { key: 'SARPANCH', label: 'Sarpanch (Admin)', icon: Shield, desc: 'Grievance Routing & Notices' },
    { key: 'ORGANIZATION', label: 'Jal Shakti (Org)', icon: Building2, desc: 'Department Stream' },
    { key: 'PROVIDER', label: 'Resource Person', icon: Wrench, desc: 'Service Provider Stream' },
  ];

  return (
    <>
      <div className="bg-amber-500 text-slate-900 border-b border-amber-600 px-3 py-1.5 shadow-sm text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase tracking-wider bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">
              STAKEHOLDER GATEWAY
            </span>
            <span className="hidden sm:inline">
              Active: <strong className="underline">{currentUser?.name || 'Guest'}</strong> (
              {currentUser?.role || 'RESIDENT'})
            </span>

            <button
              onClick={() => setOpenModal(true)}
              className="px-2 py-0.5 rounded bg-slate-900/15 hover:bg-slate-900/25 text-slate-900 font-extrabold text-[11px] flex items-center gap-1 transition-colors"
              title="Open full-screen stakeholder chooser"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Choose Role</span>
            </button>
          </div>

          {/* 1-Click Role Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold opacity-80 mr-1 hidden md:inline">Jump to Stream:</span>
            {roles.map((r) => {
              const isActive = currentUser?.role === r.key;
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  disabled={switching}
                  onClick={() => switchRole(r.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all font-bold text-[11px] ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800'
                      : 'bg-amber-400/80 hover:bg-amber-300 text-slate-900'
                  }`}
                  title={`Enter ${r.desc}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{r.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {openModal && (
        <StakeholderModal forceOpen={true} onClose={() => setOpenModal(false)} />
      )}
    </>
  );
}
