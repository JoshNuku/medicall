'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, ChevronRight, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useData } from '@/lib/data-context';

interface TopHeaderProps {
  onToggleSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar }) => {
  const { metrics, alerts, isBackendOnline } = useData();
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const openAlerts = useMemo(() => {
    return alerts.filter((a) => a.status === 'open').slice(0, 4);
  }, [alerts]);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const items: { label: string; href: string }[] = [{ label: 'Overview', href: '/dashboard' }];

    if (segments[0] === 'dashboard') {
      return items;
    }

    if (segments[0] === 'patients') {
      const patientId = segments[1];
      items.push({ label: 'Patients', href: '/patients' });
      if (patientId) items.push({ label: `Patient #${patientId}`, href: pathname });
      return items;
    }

    if (segments[0] === 'alerts') {
      items.push({ label: 'Alerts', href: '/alerts' });
      return items;
    }

    if (segments[0] === 'settings') {
      items.push({ label: 'Settings', href: '/settings' });
      return items;
    }

    if (segments[0] === 'support') {
      items.push({ label: 'Support', href: '/support' });
      return items;
    }

    return items;
  }, [pathname]);

  return (
    <header className="hidden md:flex h-16 bg-white border-b border-[#EAEAEA] px-4 sm:px-6 md:px-8 items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              <Link href={crumb.href} className={idx === breadcrumbs.length - 1 ? 'text-gray-800 font-semibold truncate' : 'hover:text-gray-900 truncate'}>
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        {isBackendOnline ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Server Live</span>
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Server Offline</span>
          </div>
        )}

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className={`relative p-2 rounded-full transition-colors cursor-pointer ${
              isNotificationsOpen ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-4 h-4" />
            {metrics.open_alerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#ECECEC] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {metrics.open_alerts > 0 ? (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {metrics.open_alerts} open
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#447817] bg-[#F0F9EB] px-2 py-0.5 rounded-full border border-[#70BF2B]/30">
                      All clear
                    </span>
                  )}
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-semibold text-[#55941E] hover:underline"
                >
                  View all
                </Link>
              </div>

              {/* Body: List of recent escalations */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {openAlerts.length === 0 ? (
                  <div className="py-8 px-4 text-center text-xs text-gray-400">
                    <CheckCircle2 className="w-6 h-6 text-[#70BF2B] mx-auto mb-2 opacity-80" />
                    <p className="font-medium text-gray-700">No unresolved escalations</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">All monitored patients are adherent</p>
                  </div>
                ) : (
                  openAlerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href={`/patients/${alert.patient_id}`}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="p-3.5 hover:bg-[#F8F9FA] transition-colors flex items-start gap-3 block group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-gray-900 group-hover:text-[#55941E] truncate transition-colors">
                            {alert.patient_name}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                            {new Date(alert.created_at).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {alert.details}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-[#FAF9F6] border-t border-gray-100 text-center">
                <Link
                  href="/alerts"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#55941E] py-1 transition-colors w-full"
                >
                  <span>Go to Alerts Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Profile with Dropdown */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#E9F6DC] text-[#55941E] font-bold text-xs flex items-center justify-center shrink-0 border border-[#70BF2B]/20">
              JN
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-900 leading-tight">Josh Nuku</div>
              <div className="text-[11px] text-gray-400 font-normal leading-tight">Pharmacist Admin</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#ECECEC] z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="px-3.5 py-2 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Josh Nuku</p>
                <p className="text-[11px] text-gray-400">nukujosh119@gmail.com</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-3.5 py-2 text-gray-700 hover:bg-[#F8F9FA] hover:text-gray-900 transition-colors"
                >
                  Dashboard Overview
                </Link>
                <Link
                  href="/patients"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-3.5 py-2 text-gray-700 hover:bg-[#F8F9FA] hover:text-gray-900 transition-colors"
                >
                  Patients Directory
                </Link>
                <Link
                  href="/alerts"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-3.5 py-2 text-gray-700 hover:bg-[#F8F9FA] hover:text-gray-900 transition-colors"
                >
                  Clinical Alerts
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-3.5 py-2 text-gray-700 hover:bg-[#F8F9FA] hover:text-gray-900 transition-colors"
                >
                  Settings
                </Link>
                <Link
                  href="/support"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-3.5 py-2 text-gray-700 hover:bg-[#F8F9FA] hover:text-gray-900 transition-colors"
                >
                  Support
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
