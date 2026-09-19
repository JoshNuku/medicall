'use client';

import React from 'react';
import Link from 'next/link';
import { CallEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { PhoneCall, Clock } from 'lucide-react';

interface CallsCardProps {
  calls: CallEvent[];
}

export const CallsCard: React.FC<CallsCardProps> = ({ calls }) => {
  return (
    <div className="bg-white border border-[#EBEAE5] rounded-2xl p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Today&apos;s calls</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Recent automated reminder calls dispatched.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Live today</span>
          </span>
        </div>

        {/* Calls list */}
        <div className="divide-y divide-gray-100 mt-2">
          {calls.slice(0, 5).map((call) => {
            const timeFormatted = new Date(call.scheduled_time).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

            return (
              <div
                key={call.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] -mx-2 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-medium text-gray-400 w-12 shrink-0">
                    {timeFormatted}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/patients/${call.patient_id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-emerald-700 truncate block transition-colors"
                    >
                      {call.patient_name}
                    </Link>
                    <span className="text-xs text-gray-500 truncate block">
                      {call.drug_name}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge variant="outcome" outcome={call.outcome} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Showing 5 of {calls.length} today</span>
        <span className="text-emerald-700 font-medium">94 confirmed / 126 total</span>
      </div>
    </div>
  );
};
