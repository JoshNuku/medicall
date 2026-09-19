'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200/75 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
};

export const MetricSkeleton = () => (
  <div className="bg-white border border-[#EBEAE5] rounded-2xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-24" />
    <Skeleton className="h-3 w-32" />
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
