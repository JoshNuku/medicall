'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Patient } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ChevronRight, ArrowRight, Phone, Plus } from 'lucide-react';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import { PrescribeMedicationModal } from '@/components/patients/PrescribeMedicationModal';

interface RecentPatientsProps {
  patients: Patient[];
}

export const RecentPatients: React.FC<RecentPatientsProps> = ({ patients }) => {
  const [activeCallPatientId, setActiveCallPatientId] = useState<number | undefined>(undefined);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activePrescribePatient, setActivePrescribePatient] = useState<Patient | null>(null);

  const displayPatients = patients.slice(0, 6);

  return (
    <>
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">
              Monitored Patients
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Active medication regimens and adherence status across Ghanaian clinics
            </p>
          </div>
          <Link
            href="/patients"
            className="text-xs font-semibold text-[#55941E] hover:underline flex items-center gap-1 transition-colors"
          >
            <span>All patients ({patients.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Clean Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                <th className="pb-3 font-medium">Patient</th>
                <th className="pb-3 font-medium">Language</th>
                <th className="pb-3 font-medium">Regimen</th>
                <th className="pb-3 font-medium">Adherence</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayPatients.map((patient) => {
                const initials = patient.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-[#F8F9FA] transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#F0F9EB] group-hover:text-[#55941E] transition-colors">
                          {initials}
                        </div>
                        <div>
                          <Link
                            href={`/patients/${patient.id}`}
                            className="font-semibold text-gray-900 group-hover:text-[#55941E] transition-colors block text-sm"
                          >
                            {patient.name}
                          </Link>
                          <span className="block text-[11px] text-gray-400 font-mono">
                            {patient.phone_number}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wider text-[10px]">
                        {patient.preferred_language === 'twi' ? '🇬🇭 Twi' : '🇬🇧 EN'}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4 text-gray-700 text-xs sm:text-sm font-medium">
                      {patient.current_medication_name || 'Prescribed Regimen'}
                    </td>

                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-900 w-8">
                          {patient.adherence_rate}%
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              patient.adherence_rate >= 85 ? 'bg-[#70BF2B]' : 'bg-amber-400'
                            }`}
                            style={{ width: `${patient.adherence_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <Badge variant="status" status={patient.status} size="sm" />
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Instant Call Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCallPatientId(patient.id);
                            setIsCallModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-[#F0F9EB] hover:text-[#55941E] hover:border-[#70BF2B]/40 text-gray-500 transition-colors"
                          title="Trigger live call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* Prescribe Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePrescribePatient(patient);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-gray-500 transition-colors"
                          title="Prescribe medication"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* View Profile */}
                        <Link
                          href={`/patients/${patient.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors inline-block"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-3">
          {displayPatients.map((patient) => (
            <div
              key={patient.id}
              className="p-4 rounded-xl border border-gray-100 bg-[#FAF9F6] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/patients/${patient.id}`}
                    className="font-semibold text-sm text-gray-900 hover:text-[#55941E]"
                  >
                    {patient.name}
                  </Link>
                  <span className="block text-xs text-gray-400 font-mono">
                    {patient.phone_number}
                  </span>
                </div>
                <Badge variant="status" status={patient.status} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200/50">
                <span>Adherence: <strong className="text-gray-900">{patient.adherence_rate}%</strong></span>
                <span className="font-semibold text-[10px] uppercase bg-gray-200 px-1.5 py-0.5 rounded">
                  {patient.preferred_language}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setActiveCallPatientId(patient.id);
                    setIsCallModalOpen(true);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-[#70BF2B]" />
                  <span>Call</span>
                </button>
                <Link
                  href={`/patients/${patient.id}`}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#70BF2B] text-white"
                >
                  View Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TriggerCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultPatientId={activeCallPatientId}
      />

      {activePrescribePatient && (
        <PrescribeMedicationModal
          isOpen={true}
          onClose={() => setActivePrescribePatient(null)}
          patientId={activePrescribePatient.id}
          patientName={activePrescribePatient.name}
        />
      )}
    </>
  );
};
