'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useData } from '@/lib/data-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { metrics } = useData();

  const mainNav = [
    {
      name: 'Dashboard',
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
  ];

  const systemNav = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
    {
      name: 'Support',
      href: '/support',
      icon: HelpCircle,
      active: pathname === '/support',
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EAEAEA] h-screen sticky top-0 shrink-0 select-none">
      {/* Top Brand Logo Header */}
      <div className="h-16 px-5 border-b border-[#F0F0F0] flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Image
            src="/logo.jpg"
            alt="MediCall"
            width={140}
            height={46}
            className="h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            priority
          />
        </Link>
      </div>

      {/* Navigation Sections matching screenshot */}
      <div className="px-3 py-4 flex-1 space-y-6 overflow-y-auto">
        {/* Main Section */}
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Main
          </p>
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    item.active
                      ? 'bg-[#70BF2B] text-white font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-950 hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        item.active ? 'text-white stroke-[2.2]' : 'text-gray-500'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.active
                          ? 'bg-white text-[#70BF2B]'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Section */}
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            System
          </p>
          <div className="space-y-1">
            {systemNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    item.active
                      ? 'bg-[#70BF2B] text-white font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-950 hover:bg-[#F8F9FA]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      item.active ? 'text-white stroke-[2.2]' : 'text-gray-500'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Logout Button matching screenshot */}
      <div className="p-3 border-t border-[#F0F0F0]">
        <button
          onClick={() => alert('Session logged out.')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Logout Account</span>
        </button>
      </div>
    </aside>
  );
};
