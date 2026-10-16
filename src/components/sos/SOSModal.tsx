'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Share2,
  MessageSquare,
  MapPin,
  CheckCircle2,
  X,
  Send,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { queueOfflineItem } from '@/lib/offline-queue';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SOSModal({ isOpen, onClose }: SOSModalProps) {
  const { t, speak } = useTranslation();
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 18.3164,
    lng: 73.8682,
  });
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [alertSent, setAlertSent] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Auto capture geolocation on modal open
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // default village coords if permission denied
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  const dispatchAlert = async () => {
    setDispatching(true);
    const payload = {
      lat: coords.lat,
      lng: coords.lng,
      message: 'EMERGENCY: Women safety assistance required immediately at current location.',
    };

    if (!navigator.onLine) {
      // Offline queue
      await queueOfflineItem('SOS', payload);
      setAlertSent(true);
      speak('Offline SOS saved. Alert will transmit once connection is restored.');
      setDispatching(false);
      return;
    }

    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAlertSent(true);
        speak('Emergency SOS alert transmitted to Sarpanch and nearby volunteers.');
      }
    } catch {
      await queueOfflineItem('SOS', payload);
      setAlertSent(true);
    } finally {
      setDispatching(false);
    }
  };

  const mapLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  const shareText = encodeURIComponent(
    `🚨 EMERGENCY SOS from GramSetu! I need immediate help at this location: ${mapLink}`
  );

  const quickDials = [
    { label: '112 National Emergency', number: '112', color: 'bg-red-600 hover:bg-red-700' },
    { label: '1091 Women Helpline', number: '1091', color: 'bg-rose-600 hover:bg-rose-700' },
    { label: '181 Women in Distress', number: '181', color: 'bg-pink-600 hover:bg-pink-700' },
    { label: '108 Free Ambulance', number: '108', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: '100 Police Patrol', number: '100', color: 'bg-blue-600 hover:bg-blue-700' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border-2 border-red-500">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {t('sos.title')}
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline indicator if applicable */}
        {isOffline && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 font-medium">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Device is offline. Quick phone dials and SMS work immediately through your telecom network.
            </span>
          </div>
        )}

        {/* Primary Action: Send Live Village Alert */}
        <div className="mb-6">
          {!alertSent ? (
            <button
              onClick={dispatchAlert}
              disabled={dispatching}
              className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Transmitting Live Alert...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Send Village SOS to Sarpanch & Volunteers
                </>
              )}
            </button>
          ) : (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-2xl p-4 text-center text-green-900 dark:text-green-200 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>SOS Alert Transmitted to Verified Volunteers</span>
            </div>
          )}
        </div>

        {/* Quick Dial Emergency Helpline Buttons */}
        <div className="mb-6">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {t('sos.quickDials')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickDials.map((dial) => (
              <a
                key={dial.number}
                href={`tel:${dial.number}`}
                className={`flex items-center justify-between p-3 rounded-xl text-white font-bold text-xs shadow-sm transition-transform active:scale-95 ${dial.color}`}
              >
                <span>{dial.label}</span>
                <PhoneCall className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Share with Trusted Contacts via WhatsApp & SMS */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Share Location with Family & Trusted Contacts
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </a>

            <a
              href={`sms:?body=${shareText}`}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              <MessageSquare className="w-4 h-4" /> SMS App
            </a>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center italic">
            * Note: Web browsers require user confirmation to launch SMS/calls and cannot silently transmit carrier SMS.
          </p>
        </div>
      </div>
    </div>
  );
}
