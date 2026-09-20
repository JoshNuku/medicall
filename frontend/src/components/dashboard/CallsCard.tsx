'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CallEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Phone, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';

interface CallsCardProps {
  calls: CallEvent[];
}

export const CallsCard: React.FC<CallsCardProps> = ({ calls }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);

  const displayCalls = calls.slice(0, 5);

  return (
    <>
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 flex flex-col justify-between h-full shadow-xs">
        <div>
          {/* Header matching screenshot */}
          <div className="flex items-center justify-between mb-4 pb-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                Call Activity &amp; Live Queue
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Automated outbound reminder timeline</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
              <span>Today</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Calls List */}
          {displayCalls.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p>No call events recorded yet for today.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayCalls.map((call) => {
                const timeFormatted = new Date(call.scheduled_time).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });

                return (
                  <div
                    key={call.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] -mx-2 px-2 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-medium text-gray-400 w-12 shrink-0">
                        {timeFormatted}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${call.patient_id}`}
                          className="text-sm font-semibold text-gray-900 group-hover:text-[#55941E] truncate block transition-colors"
                        >
                          {call.patient_name}
                        </Link>
                        <span className="text-xs text-gray-400 truncate block">
                          {call.drug_name}
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-emerald-50 text-[#70BF2B] transition-all"
                        title="Trigger live test call to this patient"
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

        {/* Card Footer Summary */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {displayCalls.length} of {calls.length} calls</span>
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="text-xs font-semibold text-[#55941E] hover:underline flex items-center gap-1"
          >
            <span>+ Dial Patient</span>
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
