'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="bg-white border border-[#EBEAE5] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E0] flex items-center justify-center text-gray-500 mb-4 shadow-xs">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs mb-5">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
