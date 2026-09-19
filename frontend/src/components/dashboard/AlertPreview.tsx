'use client';

import React from 'react';
import Link from 'next/link';
import { EscalationAlert } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface AlertPreviewProps {
  alerts: EscalationAlert[];
}

export const AlertPreview: React.FC<AlertPreviewProps> = ({ alerts }) => {
  const openAlerts = alerts.filter((a) => a.status === 'open').slice(0, 3);

  return (
    <div className="bg-white border border-[#EBEAE5] rounded-2xl p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Needs attention</h2>
        </div>
        <Link
          href="/alerts"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
        >
          <span>View all alerts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {openAlerts.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          <p>No unresolved alerts right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {openAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-4 flex flex-col justify-between hover:border-gray-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="alert" alertType={alert.escalation_type} size="sm" />
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(alert.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Link
                  href={`/patients/${alert.patient_id}`}
                  className="font-semibold text-sm text-gray-900 hover:text-emerald-700 block truncate"
                >
                  {alert.patient_name}
                </Link>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                  {alert.details}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-mono">{alert.patient_phone}</span>
                <Link
                  href="/alerts"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
