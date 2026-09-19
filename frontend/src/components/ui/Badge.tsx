'use client';

import React from 'react';
import { Check, X, PhoneOff, Minus, AlertTriangle, CheckCircle2, ShieldCheck, Mic, FileText } from 'lucide-react';
import { CallOutcome, EscalationType, PatientStatus } from '@/lib/types';

interface BadgeProps {
  variant?: 'outcome' | 'status' | 'alert' | 'language' | 'source' | 'custom';
  outcome?: CallOutcome;
  status?: PatientStatus | 'open' | 'resolved';
  alertType?: EscalationType;
  language?: 'twi' | 'english';
  source?: 'template' | 'recorded';
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'custom',
  outcome,
  status,
  alertType,
  language,
  source,
  children,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  // 1. Call outcome badges
  if (variant === 'outcome' && outcome) {
    switch (outcome) {
      case 'confirmed':
        return (
          <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses} ${className}`}>
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>Confirmed</span>
          </span>
        );
      case 'not_taken':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}>
            <X className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
            <span>Not taken</span>
          </span>
        );
      case 'no_answer':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 ${sizeClasses} ${className}`}>
            <PhoneOff className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
            <span>No answer</span>
          </span>
        );
      case 'answered_no_keypress':
        return (
          <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
            <Minus className="w-3.5 h-3.5 text-slate-500 stroke-[2.5]" />
            <span>No keypress</span>
          </span>
        );
    }
  }

  // 2. Patient status badges
  if (variant === 'status' && status) {
    if (status === 'active') {
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
        </span>
      );
    }
    if (status === 'attention') {
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Attention</span>
        </span>
      );
    }
    if (status === 'resolved') {
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses} ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Resolved</span>
        </span>
      );
    }
    if (status === 'open') {
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200/70 ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Open</span>
        </span>
      );
    }
  }

  // 3. Alert reason badges
  if (variant === 'alert' && alertType) {
    switch (alertType) {
      case 'pharmacist_cost':
        return (
          <span className={`inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200/80 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            <span>Cost barrier</span>
          </span>
        );
      case 'health_worker_side_effect':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Side effects</span>
          </span>
        );
      case 'repeated_forgetting':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Repeated forgetting</span>
          </span>
        );
      case 'same_day_multiple_misses':
        return (
          <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Multiple missed doses</span>
          </span>
        );
      case 'patient_requested_help':
        return (
          <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Help requested</span>
          </span>
        );
      case 'general_attention':
        return (
          <span className={`inline-flex items-center rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200/80 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
            <span>Attention</span>
          </span>
        );
    }
  }

  // 4. Language badge
  if (variant === 'language' && language) {
    return (
      <span className={`inline-flex items-center rounded-md font-medium tracking-wide uppercase ${
        language === 'twi' 
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px] px-2 py-0.5' 
          : 'bg-slate-100 text-slate-700 border border-slate-200 text-[11px] px-2 py-0.5'
      } ${className}`}>
        {language === 'twi' ? 'Twi' : 'English'}
      </span>
    );
  }

  // 5. Instruction source badge
  if (variant === 'source' && source) {
    return source === 'template' ? (
      <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${sizeClasses} ${className}`}>
        <ShieldCheck className="w-3 h-3 text-indigo-600" />
        <span>Verified Template</span>
      </span>
    ) : (
      <span className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 ${sizeClasses} ${className}`}>
        <Mic className="w-3 h-3 text-purple-600" />
        <span>Pharmacist Recorded</span>
      </span>
    );
  }

  // Custom fallback
  return (
    <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
