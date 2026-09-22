'use client';

import React from 'react';
import { CallEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { PhoneCall, RotateCcw, HelpCircle, PhoneForwarded } from 'lucide-react';

interface CallTimelineProps {
  logs: CallEvent[];
}

export const CallTimeline: React.FC<CallTimelineProps> = ({ logs }) => {
  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <PhoneCall className="w-3.5 h-3.5 text-gray-500" />;
      case 'retry':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      case 'diagnostic':
        return <HelpCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'relisten':
        return <PhoneForwarded className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <PhoneCall className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const getCallTypeBadge = (type: string) => {
    switch (type) {
      case 'reminder':
        return (
          <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
            Reminder
          </span>
        );
      case 'retry':
        return (
          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Retry call
          </span>
        );
      case 'diagnostic':
        return (
          <span className="text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Diagnostic IVR
          </span>
        );
      case 'relisten':
        return (
          <span className="text-[11px] font-medium text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            Relisten
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-xs">
      <div className="pb-4 border-b border-gray-100 mb-5">
        <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
          Adherence history & call timeline
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Chronological record of automated voice calls dispatched to this patient.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No call history recorded yet. The first automated reminder will trigger at the scheduled time.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200/80">
          {logs.map((item, index) => {
            const key = item.id || item.call_event_id || `log-${index}-${item.scheduled_time || ''}`;
            const dateStr = item.scheduled_time
              ? new Date(item.scheduled_time).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'Today';
            const timeStr = item.scheduled_time
              ? new Date(item.scheduled_time).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '--:--';

            return (
              <div key={key} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-600 group-hover:scale-125 transition-transform" />

                <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 hover:border-gray-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-900">
                        {dateStr} &middot; {timeStr}
                      </span>
                      {getCallTypeBadge(item.call_type)}
                    </div>
                    <Badge variant="outcome" outcome={item.outcome} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Medication: <strong className="font-semibold text-gray-800">{item.drug_name}</strong>
                    </span>
                    {item.attempt_number > 1 && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        Attempt #{item.attempt_number}
                      </span>
                    )}
                  </div>

                  {/* Diagnostic reason callout if present */}
                  {item.diagnostic_reason && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200/70 flex items-start gap-2 bg-amber-50/70 -mx-3.5 -mb-3.5 p-3 rounded-b-xl border-amber-200/70">
                      <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-semibold text-amber-900 capitalize">
                          Diagnostic reason: {item.diagnostic_reason.replace('_', ' ')}
                        </span>
                        {item.diagnostic_note && (
                          <p className="text-amber-800 mt-0.5">{item.diagnostic_note}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
