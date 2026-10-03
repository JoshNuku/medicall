'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#E8E6E1] text-xs text-neutral-600 mb-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span className="font-medium text-neutral-800">You're offline</span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500">Showing local records</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Reconnecting...' : 'Reconnect'}</span>
        </button>
      )}
    </div>
  );
};
