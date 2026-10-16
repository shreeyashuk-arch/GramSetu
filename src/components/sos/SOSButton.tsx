'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import SOSModal from './SOSModal';

export default function SOSButton() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [holding, setHolding] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const startHold = () => {
    setHolding(true);
    setHoldProgress(0);

    // Provide haptic feedback if available
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    const startTime = Date.now();
    const duration = 2000; // 2 seconds

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(pct);
    }, 50);

    holdTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      setHolding(false);
      setHoldProgress(0);
      clearInterval(progressIntervalRef.current);
      setModalOpen(true);
    }, duration);
  };

  const cancelHold = () => {
    setHolding(false);
    setHoldProgress(0);
    clearTimeout(holdTimerRef.current);
    clearInterval(progressIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      clearTimeout(holdTimerRef.current);
      clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <>
      {/* Floating or Persistent SOS Button (fixed on bottom right on desktop, right above bottom nav on mobile) */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 select-none">
        <div className="relative group">
          {/* Circular Progress Ring when holding */}
          {holding && (
            <svg className="absolute -inset-2 w-[76px] h-[76px] -rotate-90 pointer-events-none">
              <circle
                cx="38"
                cy="38"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-red-200 dark:text-red-950/60"
              />
              <circle
                cx="38"
                cy="38"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                strokeDasharray="213"
                strokeDashoffset={213 - (213 * holdProgress) / 100}
                className="text-red-600 transition-all duration-75"
              />
            </svg>
          )}

          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onClick={() => setModalOpen(true)} // Also allow direct tap to open SOS modal for quick dials
            className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl transition-all active:scale-95 ${
              holding
                ? 'bg-red-800 scale-105 shadow-red-600/50'
                : 'bg-red-600 hover:bg-red-700 shadow-red-600/40 animate-pulse'
            }`}
            title="Women's Safety & Emergency SOS (Hold 2 seconds)"
            aria-label="Women's Safety & Emergency SOS"
          >
            <ShieldAlert className="w-7 h-7 mb-0.5" />
            <span className="text-[10px] uppercase font-black tracking-tighter">SOS</span>
          </button>
        </div>
      </div>

      {modalOpen && <SOSModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  );
}
