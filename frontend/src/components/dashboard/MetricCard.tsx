'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBg?: string;
  variant?: 'hero' | 'default' | 'compact';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  iconBg = 'bg-[#F0F9EB] text-[#70BF2B]',
  variant = 'default',
}) => {
  if (variant === 'hero') {
    return (
      <div className="bg-[#70BF2B] text-white rounded-2xl p-6 shadow-xs relative overflow-hidden transition-all hover:shadow-md flex flex-col justify-between">
        {/* Soft background glow overlay matching screenshot */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none blur-xl" />
        
        <div className="flex items-center justify-between relative z-10 mb-4">
          <span className="text-sm font-medium text-white/90 tracking-normal">
            {label}
          </span>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white backdrop-blur-xs">
            {icon}
          </div>
        </div>

        <div className="relative z-10 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{value}</div>
          {subtext && (
            <div className="text-xs text-white/80 font-normal">{subtext}</div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-5 transition-all hover:border-gray-300 hover:shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500">
            {label}
          </span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${iconBg}`}>
            {icon}
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
          {subtext && <div className="text-[11px] text-gray-400">{subtext}</div>}
        </div>
      </div>
    );
  }

  // Default White Top Row Card (like "Total Receipts" and "Pending Amount" in screenshot)
  return (
    <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 transition-all hover:border-gray-300 hover:shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-sm font-medium text-gray-600">
          {label}
        </span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-3xl sm:text-4xl font-bold text-gray-950 tracking-tight">{value}</div>
        {subtext && <div className="text-xs text-gray-400 font-normal">{subtext}</div>}
      </div>
    </div>
  );
};
