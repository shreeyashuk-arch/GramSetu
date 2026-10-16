'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Volume2, ShieldAlert, ArrowRight, CheckCheck, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  isEmergency?: boolean;
}

export default function TopTicker() {
  const { t, speak } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();

    // Listen for SSE real-time updates
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('complaint_created', () => fetchNotifications());
    eventSource.addEventListener('complaint_updated', () => fetchNotifications());
    eventSource.addEventListener('post_created', () => fetchNotifications());
    eventSource.addEventListener('sos_alert', () => fetchNotifications());

    return () => {
      eventSource.close();
    };
  }, []);

  // Rotate ticker item every 6 seconds
  useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/all/read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const markSingleRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const currentItem = notifications[currentIndex] || {
    id: 'default',
    type: 'ANNOUNCEMENT',
    title: t('app.tagline'),
    message: 'Welcome to GramSetu - Village Coordination Platform',
    isEmergency: false,
  };

  const isEmergency = currentItem.type === 'EMERGENCY' || currentItem.type === 'SOS';

  return (
    <div
      className={`relative border-b transition-colors duration-300 ${
        isEmergency
          ? 'bg-red-700 text-white border-red-800'
          : 'bg-emerald-900 text-emerald-50 border-emerald-950'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 py-1.5 sm:px-6 flex items-center justify-between text-xs sm:text-sm">
        {/* Live Ticker Area */}
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <span
            className={`flex items-center gap-1 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
              isEmergency ? 'bg-white text-red-700 animate-pulse' : 'bg-emerald-800 text-emerald-200'
            }`}
          >
            {isEmergency ? (
              <>
                <ShieldAlert className="w-3 h-3" /> ALERT
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" /> LIVE
              </>
            )}
          </span>

          <div className="truncate flex-1 font-medium">
            <span className="font-bold">{currentItem.title}: </span>
            <span className="opacity-90">{currentItem.message}</span>
          </div>

          {/* Quick Voice Read-back of this ticker alert */}
          <button
            onClick={() => speak(`${currentItem.title}. ${currentItem.message}`)}
            title="Read announcement aloud"
            className="p-1 rounded hover:bg-white/10 shrink-0 text-white/90 hover:text-white"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bell Icon with Unread Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative p-1.5 rounded-full hover:bg-white/15 transition-colors flex items-center gap-1"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-emerald-600" /> Notifications ({unreadCount} new)
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No notifications right now. All caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleRead(n.id)}
                      className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        !n.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span
                          className={`font-bold ${
                            n.type === 'EMERGENCY' || n.type === 'SOS'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setIsDropdownOpen(false)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline font-semibold"
                        >
                          View Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
