'use client';

import React from 'react';
import Link from 'next/link';
import { Patient } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ChevronRight, ArrowRight } from 'lucide-react';

interface RecentPatientsProps {
  patients: Patient[];
}

export const RecentPatients: React.FC<RecentPatientsProps> = ({ patients }) => {
  const displayPatients = patients.slice(0, 5);

  return (
    <div className="bg-white border border-[#EBEAE5] rounded-2xl p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Recent patients</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Active adherence status and upcoming call schedule.
          </p>
        </div>
        <Link
          href="/patients"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
        >
          <span>All patients</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
              <th className="pb-3 font-semibold">Patient</th>
              <th className="pb-3 font-semibold">Medication</th>
              <th className="pb-3 font-semibold">Adherence</th>
              <th className="pb-3 font-semibold">Next Call</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayPatients.map((patient) => (
              <tr
                key={patient.id}
                className="hover:bg-[#FAF9F6] transition-colors group cursor-pointer"
              >
                <td className="py-3.5 pr-3">
                  <Link href={`/patients/${patient.id}`} className="block">
                    <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {patient.name}
                    </span>
                    <span className="block text-xs text-gray-400 font-mono">
                      {patient.phone_number}
                    </span>
                  </Link>
                </td>
                <td className="py-3.5 pr-3 text-gray-700 text-xs sm:text-sm">
                  {patient.current_medication_name || 'Amoxicillin 500mg'}
                </td>
                <td className="py-3.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-gray-900">
                      {patient.adherence_rate}%
                    </span>
                    <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          patient.adherence_rate >= 85 ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${patient.adherence_rate}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-3 text-xs sm:text-sm text-gray-600 font-mono">
                  {patient.next_call_time || '14:00'}
                </td>
                <td className="py-3.5 pr-3">
                  <Badge variant="status" status={patient.status} size="sm" />
                </td>
                <td className="py-3.5 text-right">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="inline-flex items-center text-xs font-semibold text-gray-500 group-hover:text-emerald-700"
                  >
                    <span>View</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="sm:hidden space-y-3">
        {displayPatients.map((patient) => (
          <Link
            key={patient.id}
            href={`/patients/${patient.id}`}
            className="block p-3.5 rounded-xl border border-gray-100 bg-[#FAF9F6] hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm text-gray-900">{patient.name}</span>
              <Badge variant="status" status={patient.status} size="sm" />
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {patient.current_medication_name || 'Amoxicillin 500mg'}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200/50">
              <span>Adherence: <strong className="text-gray-900 font-semibold">{patient.adherence_rate}%</strong></span>
              <span className="font-mono">Next: {patient.next_call_time || '14:00'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
