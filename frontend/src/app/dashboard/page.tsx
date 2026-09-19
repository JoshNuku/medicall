'use client';

import React from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AdherenceCard } from '@/components/dashboard/AdherenceCard';
import { CallsCard } from '@/components/dashboard/CallsCard';
import { AlertPreview } from '@/components/dashboard/AlertPreview';
import { RecentPatients } from '@/components/dashboard/RecentPatients';
import { MetricSkeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Users, Activity, PhoneCall, AlertTriangle, Bell, Calendar, RotateCcw } from 'lucide-react';

export default function DashboardPage() {
  const { patients, todayCalls, alerts, adherenceHistory, metrics, isLoading, error, refetch } = useData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Error / Offline Banner with Retry */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Editorial Header */}
      <PageHeader
        title="Good morning, Kwame"
        subtitle="Here's how medication adherence is looking today."
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 bg-white border border-[#EBEAE5] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 shadow-xs">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Today &middot; September 17, 2026</span>
            </div>
            <Link
              href="/alerts"
              className="p-2 sm:px-3 sm:py-2 bg-white border border-[#EBEAE5] hover:border-gray-300 rounded-xl text-gray-700 relative shadow-xs transition-colors flex items-center gap-1.5"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-gray-500" />
              {metrics.open_alerts > 0 && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full">
                  {metrics.open_alerts}
                </span>
              )}
            </Link>
          </div>
        }
      />

      {/* Four Primary Summary Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <MetricCard
            label="Patients"
            value={metrics.total_patients}
            subtext={metrics.patients_delta}
            icon={<Users className="w-4 h-4" />}
            iconBg="bg-emerald-50 text-emerald-700 border border-emerald-200/60"
          />
          <MetricCard
            label="Adherence"
            value={`${metrics.overall_adherence}%`}
            subtext={metrics.adherence_delta}
            icon={<Activity className="w-4 h-4" />}
            iconBg="bg-emerald-50 text-emerald-700 border border-emerald-200/60"
            accentBorder
          />
          <MetricCard
            label="Calls Today"
            value={metrics.calls_today}
            subtext={`${metrics.calls_today_confirmed} confirmed`}
            icon={<PhoneCall className="w-4 h-4" />}
            iconBg="bg-slate-100 text-slate-700 border border-slate-200"
          />
          <MetricCard
            label="Open Alerts"
            value={metrics.open_alerts}
            subtext={`${metrics.urgent_alerts} urgent action`}
            icon={<AlertTriangle className="w-4 h-4" />}
            iconBg="bg-rose-50 text-rose-700 border border-rose-200/70"
          />
        </div>
      )}

      {/* Main Dashboard: Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <AdherenceCard
            overallRate={metrics.overall_adherence}
            history={adherenceHistory}
          />
        </div>
        <div className="lg:col-span-5">
          <CallsCard calls={todayCalls} />
        </div>
      </div>

      {/* Needs Attention Section */}
      <AlertPreview alerts={alerts} />

      {/* Recent Patients Table / Cards */}
      <RecentPatients patients={patients} />
    </div>
  );
}
