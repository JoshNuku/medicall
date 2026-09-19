'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  iconBg?: string;
  accentBorder?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  iconBg = 'bg-emerald-50 text-emerald-700',
  accentBorder = false,
}) => {
  return (
    <div
      className={`bg-white border ${
        accentBorder ? 'border-emerald-200/90 shadow-xs' : 'border-[#EBEAE5]'
      } rounded-2xl p-5 transition-all hover:border-gray-300 hover:shadow-xs`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-bold text-gray-950 tracking-tight">{value}</div>
        <div className="text-xs text-gray-500 font-normal">{subtext}</div>
      </div>
    </div>
  );
};
