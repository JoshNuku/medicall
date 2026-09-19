'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Settings,
  Activity,
  User,
} from 'lucide-react';
import { useData } from '@/lib/data-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { metrics } = useData();

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
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EBEAE5] h-screen sticky top-0 shrink-0 select-none">
      {/* Brand / Logo */}
      <div className="p-6 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
          <Activity className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-gray-900 tracking-tight">MediCall</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/60">
              MVP
            </span>
          </div>
          <p className="text-xs text-gray-400 font-normal">Adherence Platform</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 py-4 flex-1 space-y-1">
        <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-emerald-50/80 text-emerald-900 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? 'text-emerald-700 stroke-[2.2]' : 'text-gray-400'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    item.active
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-5 border-t border-[#EBEAE5]" />

        <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          System
        </p>
        <Link
          href="#settings"
          onClick={(e) => {
            e.preventDefault();
            alert('Settings configured for Accra Central Pharmacy · Ghana Health Service standard');
          }}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-[#FAF9F6] transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span>Settings</span>
        </Link>
      </div>

      {/* Bottom Pharmacist Profile Card */}
      <div className="p-4 border-t border-[#EBEAE5] bg-[#FAF9F6]/60">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#EBEAE5]">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-sm border border-emerald-200">
            KM
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">Kwame Mensah</h4>
            <p className="text-xs text-gray-500 truncate">Pharmacist</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
