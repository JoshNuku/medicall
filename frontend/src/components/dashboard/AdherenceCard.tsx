'use client';

import React, { useMemo, useState } from 'react';
import { DailyAdherence } from '@/lib/types';
import { ChevronDown, TrendingUp, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useData } from '@/lib/data-context';

interface AdherenceCardProps {
  overallRate: number;
  history: DailyAdherence[];
}

export const AdherenceCard: React.FC<AdherenceCardProps> = ({
  overallRate,
  history,
}) => {
  const { isLoading } = useData();
  const [activeDay, setActiveDay] = useState<DailyAdherence | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const chartHistory = useMemo(() => {
    if (!history || history.length === 0) {
      return Array.from({ length: 7 }, (_, idx) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx],
        date: '',
        rate: 0,
        confirmed_doses: 0,
        total_doses: 0,
      }));
    }
    return history.slice(-7);
  }, [history]);

  const maxRate = 100;

  if (isLoading && (!history || history.length === 0)) {
    return (
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full min-h-[290px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-36 h-5 rounded" />
            <Skeleton className="w-24 h-7 rounded-lg" />
          </div>
          <div className="flex gap-4 mb-6">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 h-36 pt-4 px-2">
          {[40, 65, 55, 80, 70, 90, 85].map((heightPct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton className="w-full rounded-t-lg" style={{ height: `${heightPct}%` }} />
              <Skeleton className="w-6 h-3 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full min-h-[290px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">Adherence Overview</h2>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="appearance-none border border-gray-200 bg-white rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20"
            >
              <option value="7d">This Week</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-gray-900">No adherence data yet</p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">Once patients are enrolled and reminder calls begin, the adherence trend will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 flex flex-col justify-between h-full shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">Adherence Overview</h2>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="appearance-none border border-gray-200 bg-white rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20"
            >
              <option value="7d">This Week</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs mb-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#70BF2B]" />
            <span className="text-gray-600 font-medium">Confirmed ({overallRate || 0}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-gray-600 font-medium">Pending Retries ({Math.max(0, Math.round((overallRate || 0) * 0.08))}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-gray-600 font-medium">Missed / Escalated ({Math.max(0, 100 - (overallRate || 0))}%)</span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 sm:gap-3.5 h-44 pt-6 px-1">
          {chartHistory.map((item, idx) => {
            const isSelected = activeDay?.day === item.day;
            const isToday = idx === chartHistory.length - 1;
            const barHeight = item.total_doses > 0 ? `${(item.rate / maxRate) * 100}%` : '0%';

            return (
              <div
                key={`${item.day}-${idx}`}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setActiveDay(item)}
                onMouseLeave={() => setActiveDay(null)}
              >
                {isSelected && item.total_doses > 0 && (
                  <div className="absolute -top-12 z-20 bg-gray-950 text-white text-[11px] rounded-lg py-1 px-2.5 shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95">
                    <span className="font-semibold">{item.day}: {item.rate}%</span>
                    <span className="block text-[10px] text-gray-300">
                      {item.confirmed_doses}/{item.total_doses} doses taken
                    </span>
                  </div>
                )}

                <div className="w-full max-w-[34px] bg-[#F5F6F8] rounded-t-xl h-full flex items-end p-0.5 transition-colors group-hover:bg-[#EAEAEA]">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      isToday
                        ? 'bg-[#70BF2B] group-hover:bg-[#62A825]'
                        : item.rate >= 85
                        ? 'bg-[#70BF2B]/85 group-hover:bg-[#70BF2B]'
                        : 'bg-amber-400/90 group-hover:bg-amber-500'
                    }`}
                    style={{ height: barHeight }}
                  />
                </div>

                <div className="mt-2.5 text-center">
                  <span
                    className={`text-xs block ${
                      isToday ? 'font-bold text-gray-900' : 'text-gray-500 font-medium'
                    }`}
                  >
                    {item.day}
                  </span>
                  <span className="text-[10px] text-gray-400 block font-mono">
                    {item.total_doses > 0 ? `${item.rate}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
