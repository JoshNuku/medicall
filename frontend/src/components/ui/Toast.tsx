'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import {
  CheckCircle2,
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
  dismissToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      title,
      message,
      duration = type === 'loading' ? 0 : 4500,
    }: {
      type: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration: duration || 6000 }),
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
        toasts,
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
      {/* Toast Render Viewport */}
      <div
        aria-live="assertive"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
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

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
          border: 'border-emerald-500/20 bg-white shadow-xl shadow-emerald-500/5',
          accent: 'bg-emerald-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
          border: 'border-rose-500/20 bg-white shadow-xl shadow-rose-500/5',
          accent: 'bg-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
          border: 'border-amber-500/20 bg-white shadow-xl shadow-amber-500/5',
          accent: 'bg-amber-500',
        };
      case 'loading':
        return {
          icon: <Loader2 className="w-5 h-5 text-[#70BF2B] animate-spin shrink-0 mt-0.5" />,
          border: 'border-neutral-200 bg-white shadow-xl shadow-black/5',
          accent: 'bg-[#70BF2B]',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
          border: 'border-blue-500/20 bg-white shadow-xl shadow-blue-500/5',
          accent: 'bg-blue-500',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ${style.border}`}
      style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />
      <div className="flex items-start gap-3 pl-1.5 pr-6">
        {style.icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-1 text-xs text-neutral-600 leading-relaxed break-words">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1 rounded-lg hover:bg-neutral-100"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
