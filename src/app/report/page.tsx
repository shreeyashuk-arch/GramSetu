'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Droplets,
  Zap,
  Truck,
  Car,
  HeartPulse,
  Sprout,
  GraduationCap,
  Trash2,
  Shield,
  HelpCircle,
  Mic,
  MicOff,
  Camera,
  MapPin,
  AlertTriangle,
  UserCheck,
  Send,
  Loader2,
  CheckCircle2,
  Check,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { calculatePriority } from '@/lib/priority';
import { queueOfflineItem } from '@/lib/offline-queue';

export default function ReportProblemPage() {
  const router = useRouter();
  const { t, speak, language } = useTranslation();

  // Form State
  const [category, setCategory] = useState<string>('WATER');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [lat, setLat] = useState<number>(18.3164);
  const [lng, setLng] = useState<number>(73.8682);
  const [address, setAddress] = useState<string>('Zone A, Shivapur Village');
  const [urgency, setUrgency] = useState<number>(3);
  const [peopleAffected, setPeopleAffected] = useState<number>(2);
  const [vulnerabilities, setVulnerabilities] = useState<string[]>([]);

  // Proxy Filing state
  const [isProxy, setIsProxy] = useState<boolean>(false);
  const [proxyName, setProxyName] = useState<string>('');
  const [proxyPhone, setProxyPhone] = useState<string>('');

  // Voice recording state
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Submission & Duplicate Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [duplicateAlert, setDuplicateAlert] = useState<any>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const categories = [
    { key: 'WATER', label: t('categories.WATER'), icon: Droplets, color: 'bg-blue-500' },
    { key: 'ELECTRICITY', label: t('categories.ELECTRICITY'), icon: Zap, color: 'bg-amber-500' },
    { key: 'ROADS', label: t('categories.ROADS'), icon: Truck, color: 'bg-stone-500' },
    { key: 'TRANSPORT', label: t('categories.TRANSPORT'), icon: Car, color: 'bg-indigo-500' },
    { key: 'HEALTH', label: t('categories.HEALTH'), icon: HeartPulse, color: 'bg-red-500' },
    { key: 'AGRICULTURE', label: t('categories.AGRICULTURE'), icon: Sprout, color: 'bg-emerald-600' },
    { key: 'EDUCATION', label: t('categories.EDUCATION'), icon: GraduationCap, color: 'bg-cyan-600' },
    { key: 'SANITATION', label: t('categories.SANITATION'), icon: Trash2, color: 'bg-teal-600' },
    { key: 'WOMEN_SAFETY', label: t('categories.WOMEN_SAFETY'), icon: Shield, color: 'bg-rose-600' },
    { key: 'OTHER', label: t('categories.OTHER'), icon: HelpCircle, color: 'bg-slate-600' },
  ];

  // Auto detect location on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {},
        { timeout: 4000 }
      );
    }
  }, []);

  // Web Speech API STT Setup
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported on this browser. You can type your problem.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      if (language === 'hi') recognition.lang = 'hi-IN';
      else if (language === 'mr') recognition.lang = 'mr-IN';
      else recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (!title) {
          setTitle(transcript.slice(0, 60));
          setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        } else {
          setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleVulnerabilityToggle = (vuln: string) => {
    setVulnerabilities((prev) =>
      prev.includes(vuln) ? prev.filter((v) => v !== vuln) : [...prev, vuln]
    );
  };

  // Real-time Priority Preview
  const priorityPreview = calculatePriority({
    urgency,
    peopleAffected,
    vulnerabilities,
    timeSensitivity: urgency,
    daysOpen: 0,
    category,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please enter problem title and details.');
      return;
    }

    setSubmitting(true);
    setDuplicateAlert(null);

    const payload = {
      category,
      title,
      description,
      photoUrl: photoUrl || null,
      lat,
      lng,
      address,
      urgency,
      peopleAffected,
      vulnerabilities,
      timeSensitivity: urgency,
      proxyFiledBy: isProxy ? proxyName || 'Volunteer' : null,
      proxyPhone: isProxy ? proxyPhone : null,
    };

    if (!navigator.onLine) {
      await queueOfflineItem('COMPLAINT', payload);
      setSuccessResult({
        offline: true,
        message: t('app.offlineNotice'),
      });
      speak('Complaint stored offline. Will sync once network returns.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.duplicateInfo) {
          setDuplicateAlert(data.duplicateInfo);
          speak(`Matched existing issue. Added as supporter.`);
        } else {
          setSuccessResult(data.complaint);
          speak(`Grievance registered successfully with code ${data.complaint.code}. Priority: ${data.complaint.priorityBand}`);
        }
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch {
      await queueOfflineItem('COMPLAINT', payload);
      setSuccessResult({ offline: true, message: 'Saved in offline queue.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg animate-in zoom-in-75">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-300 font-extrabold text-xs">
            {successResult.offline ? 'SAVED OFFLINE' : 'REGISTERED SUCCESSFULLY'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {successResult.offline ? 'Saved Offline' : 'Grievance Submitted!'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {successResult.offline
              ? successResult.message
              : `Your ticket has been prioritized as ${successResult.priorityBand} and sent directly to the Sarpanch and ${successResult.assignedOrgType || 'concerned department'}.`}
          </p>
        </div>

        {/* Ticket Code Box */}
        {successResult.code && (
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-dashed border-green-600/50 max-w-sm mx-auto space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Grievance Tracking Code
            </span>
            <div className="text-2xl font-black text-green-700 dark:text-green-400 tracking-wider">
              #{successResult.code}
            </div>
            <p className="text-[11px] text-slate-500">
              Save this code or click below to track live resolution progress
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/complaints/track${successResult.id ? `?id=${successResult.id}` : ''}`}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-extrabold text-sm shadow-lg shadow-green-700/25 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Track / Check Status</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/demo-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: 'SARPANCH' }),
                });
                router.push(`/sarpanch${successResult.id ? `?complaintId=${successResult.id}` : ''}`);
              } catch {
                router.push('/sarpanch');
              }
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            title="Switch to Sarpanch Portal to see incoming ticket immediately"
          >
            <Shield className="w-4 h-4" />
            <span>Open in Sarpanch Tab →</span>
          </button>

          <button
            onClick={() => {
              setSuccessResult(null);
              setTitle('');
              setDescription('');
              setPhotoUrl('');
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Report Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title Header with Voice Read-back */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t('report.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            {t('report.sub')}
          </p>
        </div>
        <button
          onClick={() => speak(`${t('report.title')}. ${t('report.sub')}`)}
          className="p-2 rounded-2xl bg-amber-100 text-amber-800 hover:bg-amber-200"
          title="Read instructions aloud"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Duplicate Cluster Warning Alert (if triggered) */}
      {duplicateAlert && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Similar Issue Already Reported (#{duplicateAlert.parentCode})</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {duplicateAlert.explanation}
          </p>
          <Link
            href="/complaints/track"
            className="inline-block py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            View Parent Issue & Support Details
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Big Icon Category Picker */}
        <div className="space-y-3">
          <label className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            1. {t('report.selectCategory')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {categories.map((c) => {
              const isSelected = category === c.key;
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border-2 transition-all ${
                    isSelected
                      ? 'border-green-600 bg-green-50 dark:bg-green-950/40 shadow-md ring-2 ring-green-600/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${c.color} text-white flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold leading-tight line-clamp-2">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Voice Mic or Type Input */}
        <div className="space-y-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Describe Problem (बोलकर या लिखकर बताएं)
            </label>

            {/* Web Speech API Microphone Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>{t('report.listening')}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{t('report.voiceSpeak')}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Problem Title (e.g., Broken water pump valve at North Well)"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what happened, exact location, or speak via mic..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />
          </div>
        </div>

        {/* Step 3: Photo Upload (URL or Camera) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-green-600" />
            <span>3. {t('report.addPhoto')}</span>
          </label>

          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Paste Photo URL or upload image link (e.g. https://...)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          {photoUrl && (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-300 shadow">
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Step 4: Urgency & Vulnerabilities Factor Inputs (for Priority Score Engine) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <label className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            4. Impact & Vulnerability Factors
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {t('report.urgency')}: {urgency} / 5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={urgency}
                onChange={(e) => setUrgency(Number(e.target.value))}
                className="w-full accent-green-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                <span>Routine</span>
                <span>Moderate</span>
                <span>Immediate Danger</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {t('report.peopleAffected')}: {peopleAffected} / 5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(Number(e.target.value))}
                className="w-full accent-green-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                <span>1 Family</span>
                <span>Street/Ward</span>
                <span>Entire Village</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2">
              {t('report.vulnerabilities')}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'elderly', label: t('report.elderly') },
                { key: 'pregnant', label: t('report.pregnant') },
                { key: 'disabled', label: t('report.disabled') },
                { key: 'children', label: t('report.children') },
              ].map((v) => {
                const checked = vulnerabilities.includes(v.key);
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleVulnerabilityToggle(v.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      checked
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transparent Live Priority Breakdown Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Predicted Priority
              </span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  priorityPreview.band === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : priorityPreview.band === 'HIGH'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-green-600 text-white'
                }`}
              >
                {priorityPreview.band} ({priorityPreview.score} / 100)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              {priorityPreview.factors.explanation}
            </p>
          </div>
        </div>

        {/* Step 5: Proxy Filing Option (File on behalf of another villager) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isProxy}
              onChange={(e) => setIsProxy(e.target.checked)}
              className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-green-600" />
              <span>{t('report.proxyFiling')}</span>
            </span>
          </label>

          {isProxy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <input
                type="text"
                value={proxyName}
                onChange={(e) => setProxyName(e.target.value)}
                placeholder={t('report.proxyName')}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium"
                required={isProxy}
              />
              <input
                type="tel"
                value={proxyPhone}
                onChange={(e) => setProxyPhone(e.target.value)}
                placeholder={t('report.proxyPhone')}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium"
                required={isProxy}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 px-6 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black text-base shadow-xl shadow-green-700/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Evaluating and Routing...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>{t('report.submit')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
