'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message = 'Unable to connect to MediCall backend.',
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="bg-rose-50/90 border border-rose-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-rose-900 shadow-xs mb-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <div>
          <span className="font-semibold block">Backend connection issue</span>
          <span className="text-rose-700 text-xs">{message}</span>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isRetrying}
          className="border-rose-200 text-rose-800 hover:bg-rose-100 shrink-0"
          icon={<RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
          onClick={onRetry}
        >
          {isRetrying ? 'Connecting...' : 'Retry connection'}
        </Button>
      )}
    </div>
  );
};
