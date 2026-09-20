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
} from 'lucide-react';
import { useData } from '@/lib/data-context';

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
          <Link
            href="/alerts"
            className="p-2 text-gray-500 hover:text-gray-900 relative rounded-lg hover:bg-gray-100"
            aria-label="Alerts"
          >
            <Bell className="w-5 h-5" />
            {metrics.open_alerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </Link>

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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  item.active
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      item.active ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 mt-2 border-t border-gray-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-200">
              KM
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">Kwame Mensah</p>
              <p className="text-[11px] text-gray-500">Pharmacist</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
