'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, MapPin, FileText, Menu } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const items = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/report', label: t('nav.report'), icon: PlusCircle, isPrimary: true },
    { href: '/map', label: t('nav.map'), icon: MapPin },
    { href: '/village-board', label: t('nav.board'), icon: FileText },
    { href: '/resources', label: t('nav.more'), icon: Menu },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6 group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-green-700 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-green-600/30 group-active:scale-95 transition-transform border-4 border-white dark:border-slate-900">
                  <Icon className="w-7 h-7 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-extrabold text-green-700 dark:text-green-400 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive
                  ? 'text-green-700 dark:text-green-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
