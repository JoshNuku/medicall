'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CallEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Phone, ChevronDown, Clock, ArrowUpRight, ListFilter, AlertTriangle } from 'lucide-react';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import { CallActivityModal } from '@/components/dashboard/CallActivityModal';

interface CallsCardProps {
  calls: CallEvent[];
}

type CallRange = 'today' | '7d' | '30d';

const diagnosticLabels: Record<string, { label: string; shell: string }> = {
  felt_better: { label: 'Felt better', shell: 'bg-amber-50 text-amber-800 border-amber-200' },
  side_effects: { label: 'Side effects', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
  cost: { label: 'Refill / Cost', shell: 'bg-orange-50 text-orange-800 border-orange-200' },
  forgot: { label: 'Forgot', shell: 'bg-blue-50 text-blue-700 border-blue-200' },
  other: { label: 'Other', shell: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export const CallsCard: React.FC<CallsCardProps> = ({ calls }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<CallRange>('today');

  const visibleCalls = useMemo(() => {
    const now = new Date();
    if (range === 'today') {
      return calls.filter((call) => {
        const callDate = new Date(call.scheduled_time || call.dose_date);
        return callDate.toDateString() === now.toDateString();
      });
    }

    const days = range === '7d' ? 7 : 30;
    return calls.filter((call) => {
      const callDate = new Date(call.scheduled_time || call.dose_date);
      const diff = (now.getTime() - callDate.getTime()) / 86400000;
      return diff >= 0 && diff <= days;
    });
  }, [calls, range]);

  const displayCalls = visibleCalls.slice(0, 5);

  return (
    <>
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">
                  Call Activity &amp; Live Queue
                </h2>
                {visibleCalls.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    {visibleCalls.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">Automated outbound reminder timeline</p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as CallRange)}
                  className="appearance-none border border-gray-200 bg-white rounded-lg px-2.5 sm:px-3 py-1.5 pr-7 sm:pr-8 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20 cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>

              {calls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
                  title="View full call log modal"
                >
                  <ListFilter className="w-3.5 h-3.5 text-gray-500" />
                  <span>Log</span>
                </button>
              )}
            </div>
          </div>

          {displayCalls.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#F8F9FA] text-gray-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <p className="font-medium text-gray-700">No call activity in this range</p>
              <p className="mt-1 text-xs text-gray-400">Scheduled reminder calls will appear here once patients are enrolled.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayCalls.map((call) => {
                const dateObj = new Date(call.scheduled_time || call.dose_date);
                const timeFormatted = dateObj.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });

                const diag = call.diagnostic_reason ? diagnosticLabels[call.diagnostic_reason] : null;

                return (
                  <div
                    key={call.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] -mx-2 px-2 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-medium text-gray-400 w-12 shrink-0">{timeFormatted}</span>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${call.patient_id}`}
                          className="text-sm font-semibold text-gray-900 group-hover:text-[#55941E] truncate block transition-colors"
                        >
                          {call.patient_name || 'Unknown patient'}
                        </Link>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-400 truncate">
                            {call.drug_name || 'Medication reminder'}
                          </span>
                          {call.call_type === 'retry' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Retry #{call.attempt_number || 2}
                            </span>
                          )}
                          {diag && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${diag.shell} flex items-center gap-0.5`}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{diag.label}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outcome" outcome={call.outcome} size="sm" />
                      <button
                        onClick={() => {
                          setSelectedPatientId(call.patient_id);
                          setIsDemoModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-emerald-50 text-[#70BF2B] transition-all cursor-pointer"
                        title="Trigger live test call to this patient"
                        aria-label="Trigger a test call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with View All Activity Action */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={() => setIsActivityModalOpen(true)}
            className="inline-flex items-center gap-1.5 font-medium text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
          >
            <ListFilter className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {visibleCalls.length > 5 ? `View all ${visibleCalls.length} calls` : `View full call log (${visibleCalls.length})`}
            </span>
          </button>

          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#55941E] hover:underline cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Dial Patient</span>
          </button>
        </div>
      </div>

      {/* Full Call Activity Log Modal */}
      <CallActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        calls={calls}
      />

      {/* Trigger Instant Demo Call Modal */}
      <TriggerCallModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        defaultPatientId={selectedPatientId}
      />
    </>
  );
};
