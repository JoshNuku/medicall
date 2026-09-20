'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EscalationAlert } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useData } from '@/lib/data-context';

interface AlertPreviewProps {
  alerts: EscalationAlert[];
}

export const AlertPreview: React.FC<AlertPreviewProps> = ({ alerts }) => {
  const { resolveAlert } = useData();
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const openAlerts = alerts.filter((a) => a.status === 'open').slice(0, 3);

  const handleResolve = async (e: React.MouseEvent, alertId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResolvingId(alertId);
    try {
      await resolveAlert(alertId, 'Josh Nuku', 'Resolved via Dashboard quick review');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">
              Needs Attention &middot; Urgent Escalations
            </h2>
            <p className="text-xs text-gray-400">Patients reporting barriers or missed doses</p>
          </div>
        </div>
        <Link
          href="/alerts"
          className="text-xs font-semibold text-[#55941E] hover:underline flex items-center gap-1 transition-colors"
        >
          <span>View all ({alerts.filter((a) => a.status === 'open').length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {openAlerts.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          <p>No unresolved clinical alerts right now. All patients adherent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {openAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-300 transition-all hover:bg-white"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
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
                  className="font-semibold text-sm text-gray-900 hover:text-[#55941E] block truncate"
                >
                  {alert.patient_name}
                </Link>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                  {alert.details}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-mono">{alert.patient_phone}</span>
                <button
                  onClick={(e) => handleResolve(e, alert.id)}
                  disabled={resolvingId === alert.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{resolvingId === alert.id ? 'Resolving...' : 'Resolve'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
