'use client';

import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  isRetrying = false,
}) => {
  // Normalize technical errors into calm, clean offline messages
  const cleanMessage = React.useMemo(() => {
    if (!message) return 'MediCall is currently running in offline mode. Local records remain viewable.';
    const lower = message.toLowerCase();
    if (
      lower.includes('fetch') ||
      lower.includes('http') ||
      lower.includes('failed to load') ||
      lower.includes('network') ||
      lower.includes('econnrefused') ||
      lower.includes('connect')
    ) {
      return 'Backend service is currently unreachable. Operating in offline mode.';
    }
    return message;
  }, [message]);

  return (
    <div className="bg-[#FAF9F7] border border-[#E8E6E1] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-neutral-800 shadow-xs mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900">Offline Mode</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100/70 text-amber-800">
              Offline
            </span>
          </div>
          <span className="text-neutral-500 text-xs mt-0.5 block">{cleanMessage}</span>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isRetrying}
          className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 shrink-0 text-xs"
          icon={<RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
          onClick={onRetry}
        >
          {isRetrying ? 'Connecting...' : 'Reconnect'}
        </Button>
      )}
    </div>
  );
};
