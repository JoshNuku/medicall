'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }) => string;
  dismissToast: (id?: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissToast = useCallback((id?: string) => {
    setActiveToast((current) => {
      if (!current) return null;
      if (id && current.id !== id) return current;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return null;
    });
  }, []);

  const showToast = useCallback(
    ({
      type,
      title,
      message,
      duration = type === 'loading' ? 0 : 4000,
    }: {
      type: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setActiveToast(newToast);

      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          setActiveToast((current) => (current?.id === id ? null : current));
        }, duration);
      }

      return id;
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration: duration || 5000 }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'info', title, message, duration }),
    [showToast]
  );

  const loading = useCallback(
    (title: string, message?: string) =>
      showToast({ type: 'loading', title, message, duration: 0 }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts: activeToast ? [activeToast] : [],
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info,
        loading,
      }}
    >
      {children}

      {/* Previous Simple Design: Single sleek dark notification pill */}
      {activeToast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200 pointer-events-auto max-w-md"
          style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          {activeToast.type === 'success' && (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {activeToast.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          {activeToast.type === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          {activeToast.type === 'loading' && (
            <Loader2 className="w-4 h-4 text-[#70BF2B] animate-spin shrink-0" />
          )}
          {activeToast.type === 'info' && (
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
          )}

          <div className="flex-1 text-sm text-gray-100 leading-snug">
            {activeToast.message ? (
              <span>{activeToast.message}</span>
            ) : (
              <span>{activeToast.title}</span>
            )}
          </div>

          <button
            onClick={() => dismissToast(activeToast.id)}
            className="text-gray-400 hover:text-white transition-colors p-0.5 rounded ml-1"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

