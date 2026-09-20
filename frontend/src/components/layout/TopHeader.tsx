'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, ChevronRight } from 'lucide-react';
import { useData } from '@/lib/data-context';

interface TopHeaderProps {
  onToggleSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar }) => {
  const { metrics } = useData();
  const pathname = usePathname();

  const breadcrumbs = React.useMemo(() => {
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

    return items;
  }, [pathname]);

  return (
    <header className="hidden md:flex h-16 bg-white border-b border-[#EAEAEA] px-4 sm:px-6 md:px-8 items-center justify-between sticky top-0 z-20 select-none">
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
        <Link
          href="/alerts"
          className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Alerts"
        >
          <Bell className="w-4 h-4" />
          {metrics.open_alerts > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </Link>

        <div className="h-6 w-px bg-gray-200" />

        <div className="flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#E9F6DC] text-[#55941E] font-bold text-xs flex items-center justify-center shrink-0 border border-[#70BF2B]/20">
            MP
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-gray-900 leading-tight">MediCall Pharmacy</div>
            <div className="text-[11px] text-gray-400 font-normal leading-tight">support@medicall.gh</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>
    </header>
  );
};
