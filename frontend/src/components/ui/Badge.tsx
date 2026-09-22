'use client';

import React from 'react';
import { Check, X, PhoneOff, Minus, AlertTriangle, CheckCircle2, ShieldCheck, Mic } from 'lucide-react';
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

const baseBadge = 'inline-flex items-center rounded-full border font-medium tracking-[0.01em]';

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
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  if (variant === 'outcome' && outcome) {
    const config = {
      confirmed: { icon: Check, label: 'Confirmed', shell: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      not_taken: { icon: X, label: 'Not taken', shell: 'bg-amber-50 text-amber-700 border-amber-200' },
      no_answer: { icon: PhoneOff, label: 'No answer', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
      answered_no_keypress: { icon: Minus, label: 'No keypress', shell: 'bg-slate-100 text-slate-700 border-slate-200' },
      pending: { icon: Minus, label: 'In progress', shell: 'bg-blue-50 text-blue-700 border-blue-200' },
      uncalled: { icon: Minus, label: 'Awaiting call', shell: 'bg-gray-100 text-gray-600 border-gray-200' },
    }[outcome];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <span className={`${baseBadge} ${config.shell} ${sizeClasses} ${className}`}>
        <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
        <span>{config.label}</span>
      </span>
    );
  }

  if (variant === 'status' && status) {
    const config = {
      active: { label: 'Active', shell: 'bg-[#EEF9E5] text-[#2F5F17] border border-[#C9E7A7]' },
      attention: { label: 'Attention', shell: 'bg-[#FFF7ED] text-[#8C5400] border border-[#F1D3A4]' },
      resolved: { label: 'Resolved', shell: 'bg-slate-100 text-slate-700 border-slate-200' },
      open: { label: 'Open', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
    }[status];

    if (!config) return null;

    return (
      <span className={`${baseBadge} ${config.shell} ${sizeClasses} ${className}`}>
        <span>{config.label}</span>
      </span>
    );
  }

  if (variant === 'alert' && alertType) {
    const config = {
      pharmacist_cost: { label: 'Cost barrier', shell: 'bg-amber-50 text-amber-800 border-amber-200' },
      health_worker_side_effect: { label: 'Side effects', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
      repeated_forgetting: { label: 'Repeated forgetting', shell: 'bg-amber-50 text-amber-800 border-amber-200' },
      same_day_multiple_misses: { label: 'Multiple missed doses', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
      patient_requested_help: { label: 'Help requested', shell: 'bg-violet-50 text-violet-700 border-violet-200' },
      general_attention: { label: 'Attention', shell: 'bg-slate-100 text-slate-700 border-slate-200' },
    }[alertType];

    if (!config) return null;

    return (
      <span className={`${baseBadge} ${config.shell} ${sizeClasses} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </span>
    );
  }

  if (variant === 'language' && language) {
    const normalized = String(language).toLowerCase();
    const label = normalized === 'twi' ? 'Twi' : normalized === 'english' ? 'English' : 'English';

    return (
      <span className={`${baseBadge} bg-slate-100 text-slate-700 border-slate-200 text-[11px] px-2 py-0.5 ${className}`}>
        {label}
      </span>
    );
  }

  if (variant === 'source' && source) {
    const isTemplate = source === 'template';
    return (
      <span className={`${baseBadge} ${isTemplate ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-700 border-slate-200'} ${sizeClasses} ${className}`}>
        {isTemplate ? <ShieldCheck className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        <span>{isTemplate ? 'Verified template' : 'Recorded audio'}</span>
      </span>
    );
  }

  if (!children) return null;

  return (
    <span className={`${baseBadge} bg-slate-100 text-slate-700 border-slate-200 ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
