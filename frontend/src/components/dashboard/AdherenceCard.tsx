'use client';

import React, { useState } from 'react';
import { DailyAdherence } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

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
    <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 flex flex-col justify-between h-full shadow-xs">
      {/* Header matching screenshot "Invoice Overview" */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">
            Adherence Overview
          </h2>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
            <span>This Week</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Legend dots matching screenshot */}
        <div className="flex flex-wrap items-center gap-4 text-xs mb-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#70BF2B]" />
            <span className="text-gray-600 font-medium">Confirmed ({overallRate}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-gray-600 font-medium">Pending Retries (9%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-gray-600 font-medium">Missed / Escalated (4%)</span>
          </div>
        </div>
      </div>

      {/* Minimalist 7-Day Chart */}
      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 sm:gap-3.5 h-44 pt-6 px-1">
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
                  <div className="absolute -top-12 z-20 bg-gray-950 text-white text-[11px] rounded-lg py-1 px-2.5 shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95">
                    <span className="font-semibold">{item.day}: {item.rate}%</span>
                    <span className="block text-[10px] text-gray-300">
                      {item.confirmed_doses}/{item.total_doses} doses taken
                    </span>
                  </div>
                )}

                {/* Bar Track */}
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

                {/* Day Label */}
                <div className="mt-2.5 text-center">
                  <span
                    className={`text-xs block ${
                      isToday ? 'font-bold text-gray-900' : 'text-gray-500 font-medium'
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
      </div>
    </div>
  );
};
