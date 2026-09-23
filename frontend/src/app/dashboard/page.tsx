'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-context';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AdherenceCard } from '@/components/dashboard/AdherenceCard';
import { CallsCard } from '@/components/dashboard/CallsCard';
import { AlertPreview } from '@/components/dashboard/AlertPreview';
import { RecentPatients } from '@/components/dashboard/RecentPatients';
import { MetricSkeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EnrollPatientModal } from '@/components/patients/EnrollPatientModal';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import {
  Activity,
  PhoneCall,
  Users,
  AlertTriangle,
  UserPlus,
  Phone,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { patients, todayCalls, allCalls, alerts, adherenceHistory, metrics, isLoading, error, refetch } = useData();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const formattedToday = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Error / Offline Banner with Retry */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Clean Minimalist Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Voice-call medication adherence platform &amp; daily monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Pill */}
          <div className="hidden lg:inline-flex items-center gap-2 bg-white border border-[#EAEAEA] px-3.5 py-2 rounded-xl text-xs font-medium text-gray-600 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Today &middot; {formattedToday}</span>
          </div>

          {/* Quick Demo Call Button */}
          <button
            onClick={() => setIsCallModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#70BF2B]/40 text-[#55941E] hover:bg-[#F0F9EB] transition-all shadow-2xs"
          >
            <Phone className="w-3.5 h-3.5 text-[#70BF2B]" />
            <span>Test Voice Call</span>
          </button>

          {/* Enroll Patient Button */}
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#70BF2B] hover:bg-[#62A825] text-white transition-all shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll Patient</span>
          </button>
        </div>
      </div>

      {/* Four Primary Summary Metrics (Strict AGENTS.md rule: Adherence, Patients, Calls Today, Alerts) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Overall Adherence Hero Card */}
          <MetricCard
            variant="hero"
            label="Overall Adherence"
            value={`${metrics.overall_adherence}%`}
            subtext="↑ +3.2% vs last week · Goal: 85%"
            icon={<Activity className="w-5 h-5 stroke-[2.2]" />}
          />

          {/* 2. Total Monitored Patients */}
          <Link href="/patients" className="block group">
            <MetricCard
              variant="default"
              label="Monitored Patients"
              value={metrics.total_patients ?? 0}
              subtext={`${Math.max(0, (metrics.total_patients ?? 0) - (metrics.open_alerts ?? 0))} adherent · ${metrics.open_alerts ?? 0} need attention`}
              icon={<Users className="w-5 h-5 text-blue-600 transition-transform group-hover:scale-110" />}
              iconBg="bg-blue-50"
            />
          </Link>

          {/* 3. Calls Today */}
          <MetricCard
            variant="default"
            label="Calls Today"
            value={metrics.calls_today ?? 0}
            subtext={
              (metrics.calls_today ?? 0) === 0
                ? "No calls scheduled today"
                : `${metrics.calls_today_confirmed ?? 0} confirmed · ${
                    (metrics.calls_today_retries ?? 0) > 0
                      ? `${metrics.calls_today_retries} retries scheduled`
                      : (metrics.calls_today_pending ?? 0) > 0
                      ? `${metrics.calls_today_pending} scheduled`
                      : 'all completed'
                  }`
            }
            icon={<PhoneCall className="w-5 h-5 text-[#70BF2B]" />}
            iconBg="bg-[#F0F9EB]"
          />

          {/* 4. Open Escalation Alerts */}
          <Link href="/alerts" className="block group">
            <MetricCard
              variant="default"
              label="Open Alerts"
              value={metrics.open_alerts ?? 0}
              subtext={(metrics.open_alerts ?? 0) > 0 ? "Requires clinician review" : "All patients adherent"}
              icon={<AlertTriangle className={`w-5 h-5 ${(metrics.open_alerts ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'} transition-transform group-hover:scale-110`} />}
              iconBg={(metrics.open_alerts ?? 0) > 0 ? "bg-rose-50" : "bg-emerald-50"}
            />
          </Link>
        </div>
      )}

      {/* Main Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <AdherenceCard
            overallRate={metrics.overall_adherence}
            history={adherenceHistory}
          />
        </div>
        <div className="lg:col-span-5">
          <CallsCard calls={allCalls.length ? allCalls : todayCalls} />
        </div>
      </div>

      {/* Row 4: Needs Attention Escalations */}
      <AlertPreview alerts={alerts} />

      {/* Row 5: Recent Patients Table */}
      <RecentPatients patients={patients} />

      {/* Modals */}
      <EnrollPatientModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
      />

      <TriggerCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
      />
    </div>
  );
}
