'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  Volume2,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  Shield,
  FileText,
  MapPin,
  Users,
  Compass,
  BarChart2,
  Lock,
  PlusCircle,
  HelpCircle,
  LogOut,
  User,
} from 'lucide-react';
import { useTranslation, LANGUAGES, SupportedLanguage } from '@/lib/i18n';
import { syncOfflineQueue, getQueuedItems } from '@/lib/offline-queue';

export default function Header() {
  const pathname = usePathname();
  const { language, setLanguage, t, speak } = useTranslation();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check network state
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queued offline items count
    checkQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkQueue = async () => {
    const items = await getQueuedItems();
    setOfflineCount(items.length);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { synced } = await syncOfflineQueue();
      if (synced > 0) {
        speak(`${synced} offline items synced successfully.`);
      }
      await checkQueue();
    } catch {}
    setIsSyncing(false);
  };

  // Fetch session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const readScreenAloud = () => {
    let screenSummary = `${t('app.name')}. `;
    if (pathname === '/') {
      screenSummary += `Welcome to GramSetu Village Coordination. Report issues, check village board announcements, or view live village map.`;
    } else if (pathname === '/report') {
      screenSummary += `Report a problem. Choose category, speak or type your issue, add photo and submit.`;
    } else if (pathname === '/map') {
      screenSummary += `Live village map. View handpumps, streetlights, resources, and community issues with zone filters.`;
    } else if (pathname === '/village-board') {
      screenSummary += `Village board. Read emergency alerts, Sarpanch announcements, and health camp notices.`;
    } else if (pathname === '/resources') {
      screenSummary += `Village resources. Match and request tractors, tankers, and technicians.`;
    } else if (pathname === '/anonymous') {
      screenSummary += `Confidential complaint filing. No account identity is attached; avoid personal details in the report text.`;
    } else if (pathname === '/schemes') {
      screenSummary += `Scheme navigator. Guided flow to find government benefits and required documents.`;
    } else if (pathname === '/analytics') {
      screenSummary += `Village Service Health Index and panchayat analytics report.`;
    } else {
      screenSummary += document.title || 'GramSetu';
    }
    speak(screenSummary);
  };

  const navLinks = [
    { href: '/', label: t('nav.home'), icon: Compass },
    { href: '/report', label: t('nav.report'), icon: PlusCircle },
    { href: '/map', label: t('nav.map'), icon: MapPin },
    { href: '/village-board', label: t('nav.board'), icon: FileText },
    { href: '/resources', label: t('nav.resources'), icon: Users },
    { href: '/anonymous', label: t('nav.anonymous'), icon: Lock },
    { href: '/schemes', label: t('nav.schemes'), icon: HelpCircle },
    { href: '/analytics', label: t('nav.analytics'), icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Offline Banner indicator */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-3 py-1 text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('app.offlineNotice')}</span>
          {offlineCount > 0 && (
            <span className="bg-amber-800 px-1.5 py-0.5 rounded text-[10px]">
              {offlineCount} queued
            </span>
          )}
        </div>
      )}

      {/* Sync Banner if items are queued and back online */}
      {isOnline && offlineCount > 0 && (
        <div className="bg-emerald-600 text-white px-3 py-1 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <span>{offlineCount} offline reports ready to sync.</span>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-white text-emerald-800 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-emerald-50 active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('app.syncNow')}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo and Village Tag */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-700 to-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            GS
          </div>
          <div>
            <div className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <span>{t('app.name')}</span>
              <span className="text-[11px] font-semibold bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">
                Shivapur
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {t('app.tagline')}
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.slice(0, 6).map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-green-100 dark:bg-green-950/70 text-green-800 dark:text-green-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Voice Help, Language Selector, User Profile */}
        <div className="flex items-center gap-2">
          {/* Voice Help Button (Accessibility for low literacy) */}
          <button
            onClick={readScreenAloud}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 font-bold text-xs shadow-sm transition-all active:scale-95 border border-amber-200 dark:border-amber-800"
            title={t('app.voiceHelp')}
          >
            <Volume2 className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">{t('app.voiceHelp')}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              <Globe className="w-4 h-4 text-green-700 dark:text-green-400" />
              <span>{language.toUpperCase()}</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      language === l.code ? 'font-black text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <span className="text-[10px] opacity-60">({l.label})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile / Login Link */}
          {currentUser ? (
            <Link
              href="/login"
              className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <User className="w-4 h-4 text-green-600" />
              <span className="hidden md:inline">{currentUser.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-bold shadow transition-colors"
            >
              {t('nav.login')}
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-1 shadow-xl animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                  isActive
                    ? 'bg-green-100 dark:bg-green-950/70 text-green-900 dark:text-green-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 text-green-600" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
