'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CallEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Phone, ChevronDown, Clock, ArrowUpRight } from 'lucide-react';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';

interface CallsCardProps {
  calls: CallEvent[];
}

type CallRange = 'today' | '7d' | '30d';

export const CallsCard: React.FC<CallsCardProps> = ({ calls }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<CallRange>('today');

  const visibleCalls = useMemo(() => {
    const now = new Date();
    if (range === 'today') {
      return calls.filter((call) => {
        const callDate = new Date(call.scheduled_time);
        return callDate.toDateString() === now.toDateString();
      });
    }

    const days = range === '7d' ? 7 : 30;
    return calls.filter((call) => {
      const callDate = new Date(call.scheduled_time);
      const diff = (now.getTime() - callDate.getTime()) / 86400000;
      return diff >= 0 && diff <= days;
    });
  }, [calls, range]);

  const displayCalls = visibleCalls.slice(0, 5);

  return (
    <>
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 flex flex-col justify-between h-full shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 pb-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">Call Activity &amp; Live Queue</h2>
              <p className="text-xs text-gray-400 mt-0.5">Automated outbound reminder timeline</p>
            </div>
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as CallRange)}
                className="appearance-none border border-gray-200 bg-white rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
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
              {displayCalls.map((call, idx) => {
                const timeFormatted = call.scheduled_time
                  ? new Date(call.scheduled_time).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  : '—';

                return (
                  <div
                    key={`call-${call.id || idx}-${idx}`}
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
                        <span className="text-xs text-gray-400 truncate block">
                          {call.drug_name || 'Medication reminder'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outcome" outcome={call.outcome} size="sm" />
                      <button
                        onClick={() => {
                          setSelectedPatientId(call.patient_id);
                          setIsDemoModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-emerald-50 text-[#70BF2B] transition-all"
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

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {displayCalls.length} of {visibleCalls.length} calls</span>
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#55941E] hover:underline"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Dial Patient</span>
          </button>
        </div>
      </div>

      <TriggerCallModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        defaultPatientId={selectedPatientId}
      />
    </>
  );
};
