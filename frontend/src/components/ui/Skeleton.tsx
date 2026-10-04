'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-xl ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const MetricSkeleton = () => (
  <div className="bg-white border border-[#EBEAE5] rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-3 shadow-xs">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-16 sm:w-20" />
      <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl" />
    </div>
    <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
    <Skeleton className="h-3 w-24 sm:w-32" />
  </div>
);

export const AdherenceCardSkeleton = () => (
  <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between h-full min-h-[320px]">
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
      </div>
    </div>
    <div className="pt-2">
      <div className="flex items-end justify-between gap-1 sm:gap-2 md:gap-3.5 h-40 sm:h-44 pt-4 sm:pt-6 px-0.5 sm:px-1">
        {[40, 65, 80, 50, 85, 70, 75].map((h, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
            <div className="w-full max-w-[34px] bg-[#F5F6F8] rounded-t-xl h-full flex items-end p-0.5">
              <Skeleton className="w-full rounded-t-lg" style={{ height: `${h}%` }} />
            </div>
            <Skeleton className="h-3 w-6 mt-2.5" />
            <Skeleton className="h-2.5 w-5 mt-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CallsCardSkeleton = () => (
  <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between h-full min-h-[320px]">
    <div>
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 pb-1">
        <div>
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-[#FAFAFA]">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const AlertPreviewSkeleton = () => (
  <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-6 shadow-xs">
    <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 mb-3 sm:mb-4 gap-2">
      <div className="flex items-center gap-2 sm:gap-2.5">
        <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-44 mb-1" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-7 w-full rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export const RecentPatientsSkeleton = () => (
  <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-6 shadow-xs">
    <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 mb-3 sm:mb-4 gap-2">
      <div>
        <Skeleton className="h-5 w-36 mb-1" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase text-gray-400">
            <th className="pb-3">Patient</th>
            <th className="pb-3">Language</th>
            <th className="pb-3">Regimen</th>
            <th className="pb-3">Adherence</th>
            <th className="pb-3">Status</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
    <div className="sm:hidden space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3.5 rounded-xl border border-gray-100 bg-[#FAFAFA] space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="py-4 px-5">
      <Skeleton className="h-4 w-32 mb-1.5" />
      <Skeleton className="h-3 w-20" />
    </td>
    <td className="py-4 px-4">
      <Skeleton className="h-4 w-28" />
    </td>
    <td className="py-4 px-4">
      <Skeleton className="h-5 w-14 rounded-md" />
    </td>
    <td className="py-4 px-4">
      <Skeleton className="h-4 w-24" />
    </td>
    <td className="py-4 px-4">
      <Skeleton className="h-4 w-20" />
    </td>
    <td className="py-4 px-4">
      <Skeleton className="h-5 w-16 rounded-full" />
    </td>
    <td className="py-4 px-5 text-right">
      <Skeleton className="h-7 w-16 ml-auto rounded-lg" />
    </td>
  </tr>
);
