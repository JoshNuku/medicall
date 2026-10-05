'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Menu,
  X,
  Bell,
  Settings,
  HelpCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { VoiceAssistantModal } from '@/components/patients/VoiceAssistantModal';
import { Modal } from '@/components/ui/Modal';

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { metrics, alerts } = useData();
  const { user } = useAuth();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const openAlerts = alerts.filter((alert) => alert.status === 'open').slice(0, 4);

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard' || pathname === '/',
    },
    {
      name: 'Patients',
      href: '/patients',
      icon: Users,
      active: pathname.startsWith('/patients'),
    },
    {
      name: 'Alerts',
      href: '/alerts',
      icon: AlertTriangle,
      active: pathname === '/alerts',
      badge: metrics.open_alerts > 0 ? metrics.open_alerts : undefined,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <header className="md:hidden bg-white border-b border-[#EBEAE5] sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="MediCall"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-1.5 text-[#447817] bg-[#F0F9EB] hover:bg-[#E5F5D8] rounded-full border border-[#70BF2B]/30 transition-colors"
            aria-label="Open AI Voice Assistant"
          >
            <Sparkles className="w-5 h-5 text-[#55941E]" />
          </button>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-900 relative rounded-lg hover:bg-gray-100"
            aria-label="Alerts"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {metrics.open_alerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="border-t border-gray-100 bg-[#FAF9F6] px-4 py-3 space-y-1 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E9F6DC] text-[#55941E] font-bold text-xs flex items-center justify-center shrink-0 border border-[#70BF2B]/20">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'MP'}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{user?.name || 'Pharmacist'}</p>
                <p className="text-[11px] text-gray-500">{user?.role || 'Clinical Staff'}</p>
              </div>
            </div>
            <LogoutButton
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              iconClassName="w-3.5 h-3.5 text-rose-500"
              onLogout={() => setIsOpen(false)}
            />
          </div>

          <Link
            href="/support"
            onClick={() => setIsOpen(false)}
            className={`mt-2 flex items-center gap-3 border-t border-gray-200/80 px-3.5 py-2.5 pt-3 rounded-xl text-sm font-medium transition-colors ${
              pathname === '/support'
                ? 'bg-[#70BF2B] text-white font-semibold'
                : 'text-gray-700 hover:bg-[#F6FAF1]'
            }`}
          >
            <HelpCircle
              className={`w-4 h-4 ${
                pathname === '/support' ? 'text-white stroke-[2.2]' : 'text-gray-500'
              }`}
            />
            <span>Support</span>
          </Link>
        </div>
      )}

      <nav
        aria-label="Primary navigation"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#EBEAE5] bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
                  item.active ? 'text-[#55941E]' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${item.active ? 'stroke-[2.4]' : ''}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
      <Modal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Notifications"
        description={
          metrics.open_alerts > 0
            ? `${metrics.open_alerts} open patient alerts`
            : 'All monitored patients are adherent.'
        }
      >
        <div className="divide-y divide-gray-100">
          {openAlerts.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#70BF2B]" />
              <p className="text-sm font-semibold text-gray-800">No unresolved escalations</p>
              <p className="mt-1 text-xs text-gray-500">All monitored patients are adherent.</p>
            </div>
          ) : (
            openAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={`/patients/${alert.patient_id}`}
                onClick={() => setIsNotificationsOpen(false)}
                className="flex items-start gap-3 py-4 transition-colors first:pt-1 hover:bg-[#F8F9FA]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{alert.patient_name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {new Date(alert.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-500">{alert.details}</span>
                </span>
              </Link>
            ))
          )}
        </div>
        <Link
          href="/alerts"
          onClick={() => setIsNotificationsOpen(false)}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[#70BF2B]/30 bg-[#F0F9EB] px-4 py-2.5 text-sm font-semibold text-[#447817] transition-colors hover:bg-[#E5F5D8]"
        >
          View all alerts
        </Link>
      </Modal>
    </header>
  );
};
