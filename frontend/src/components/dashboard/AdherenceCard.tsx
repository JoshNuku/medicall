'use client';

import React, { useState } from 'react';
import { DailyAdherence } from '@/lib/types';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

interface AdherenceCardProps {
  overallRate: number;
  history: DailyAdherence[];
}

export const AdherenceCard: React.FC<AdherenceCardProps> = ({
  overallRate,
  history,
}) => {
  const [activeDay, setActiveDay] = useState<DailyAdherence | null>(null);

  const maxRate = 100;

  return (
    <div className="bg-white border border-[#EBEAE5] rounded-2xl p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Medication adherence
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Patient dose confirmations over the last 7 days.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <TrendingUp className="w-3.5 h-3.5" />
            +3.2%
          </span>
        </div>

        {/* Big number callout */}
        <div className="mt-5 mb-6 flex items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-bold text-gray-950 tracking-tight">
            {overallRate}%
          </span>
          <div className="text-xs text-gray-500">
            <span className="block font-medium text-gray-700">Overall adherence</span>
            <span>Target threshold: 80%</span>
          </div>
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 sm:gap-3 h-40 pt-6 px-1">
          {history.map((item, idx) => {
            const isSelected = activeDay?.day === item.day;
            const isToday = idx === history.length - 1;
            const barHeight = `${(item.rate / maxRate) * 100}%`;

            return (
              <div
                key={item.day}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setActiveDay(item)}
                onMouseLeave={() => setActiveDay(null)}
              >
                {/* Tooltip on hover */}
                {isSelected && (
                  <div className="absolute -top-12 z-20 bg-gray-900 text-white text-[11px] rounded-lg py-1 px-2.5 shadow-md whitespace-nowrap animate-in fade-in zoom-in-95">
                    <span className="font-semibold">{item.day}: {item.rate}%</span>
                    <span className="block text-[10px] text-gray-300">
                      {item.confirmed_doses}/{item.total_doses} doses
                    </span>
                  </div>
                )}

                {/* Bar */}
                <div className="w-full max-w-[32px] bg-slate-100 rounded-t-lg h-full flex items-end p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isToday
                        ? 'bg-emerald-600 group-hover:bg-emerald-500'
                        : item.rate >= 85
                        ? 'bg-emerald-500/85 group-hover:bg-emerald-600'
                        : 'bg-amber-400/90 group-hover:bg-amber-500'
                    }`}
                    style={{ height: barHeight }}
                  />
                </div>

                {/* Day Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs block ${
                      isToday ? 'font-bold text-gray-900' : 'text-gray-400 font-medium'
                    }`}
                  >
                    {item.day}
                  </span>
                  <span className="text-[10px] text-gray-400 block font-mono">
                    {item.rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Above target (&ge;85%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Borderline (&lt;85%)
            </span>
          </div>
          <span className="font-medium text-gray-500">Mon &ndash; Sun</span>
        </div>
      </div>
    </div>
  );
};
