import React, { useState } from 'react';
import Link from 'next/link';
import { Patient, Medication } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ChevronRight, ArrowRight, Phone, Plus, Volume2 } from 'lucide-react';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import { PrescribeMedicationModal } from '@/components/patients/PrescribeMedicationModal';
import { Modal } from '@/components/ui/Modal';
import { AudioPlayer } from '@/components/patients/AudioPlayer';
import { useData } from '@/lib/data-context';

interface RecentPatientsProps {
  patients: Patient[];
}

export const RecentPatients: React.FC<RecentPatientsProps> = ({ patients }) => {
  const { getPatientMedications, loadPatientDetails } = useData();
  const [activeCallPatientId, setActiveCallPatientId] = useState<number | undefined>(undefined);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activePrescribePatient, setActivePrescribePatient] = useState<Patient | null>(null);
  const [audioPreviewPatient, setAudioPreviewPatient] = useState<Patient | null>(null);
  const [dashboardAudioTrackByMed, setDashboardAudioTrackByMed] = useState<Record<number, 'prescription' | 'reminder'>>({});

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
                      <Badge variant="language" language={patient.preferred_language} size="sm" />
                    </td>

                    <td className="py-3.5 pr-4 text-gray-700 text-xs sm:text-sm font-medium">
                      {patient.current_medication_name || 'Prescribed Regimen'}
                    </td>

                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-900 w-8">
                          {patient.adherence_rate !== null && patient.adherence_rate !== undefined ? `${patient.adherence_rate}%` : '--'}
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          {patient.adherence_rate !== null && patient.adherence_rate !== undefined ? (
                            <div
                              className={`h-full rounded-full ${patient.adherence_rate >= 85 ? 'bg-[#70BF2B]' : 'bg-amber-400'
                                }`}
                              style={{ width: `${patient.adherence_rate}%` }}
                            />
                          ) : (
                            <div className="h-full rounded-full bg-gray-200 w-0" />
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <Badge variant="status" status={patient.status} size="sm" />
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Audio Preview Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadPatientDetails(patient.id);
                            setAudioPreviewPatient(patient);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-[#F0F9EB] hover:text-[#55941E] hover:border-[#70BF2B]/40 text-gray-500 transition-colors"
                          title="Preview dose reminder & prescription audio"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

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
                <span>Adherence: <strong className="text-gray-900">{patient.adherence_rate !== null && patient.adherence_rate !== undefined ? `${patient.adherence_rate}%` : 'New'}</strong></span>
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

      {/* Quick Audio Preview Modal (Dose Reminder vs Full Prescription) */}
      {audioPreviewPatient && (
        <Modal
          isOpen={true}
          onClose={() => setAudioPreviewPatient(null)}
          title={`Audio tracks for ${audioPreviewPatient.name}`}
          description={`Listen to the outbound daily reminder prompt and full prescription audio (${audioPreviewPatient.preferred_language === 'english' ? 'English' : 'Asante Twi'}).`}
          maxWidth="lg"
        >
          <div className="space-y-6 pt-2">
            {(() => {
              const meds = getPatientMedications(audioPreviewPatient.id);
              if (!meds || meds.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No active medications found for {audioPreviewPatient.name}. Prescribe a medication to configure voice audio.
                  </div>
                );
              }

              return meds.map((med) => {
                const isMedEnglish =
                  med.language === 'english' ||
                  Boolean(med.audio_url?.includes('_en')) ||
                  Boolean(med.audio_url?.includes('default-reminder-en'));
                const medLangLabel = isMedEnglish ? 'English' : 'Twi';

                return (
                  <div key={med.id} className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm tracking-tight">{med.drug_name}</h4>
                        <p className="text-xs text-gray-500 font-medium">
                          {med.dosage_label || '1 tablet'} &middot; {med.frequency_label || 'Twice daily'} &middot; {med.timing_label || 'After meals'}
                        </p>
                      </div>
                      <Badge variant="status" status="active" size="sm" />
                    </div>

                    {/* Single Clean Audio Player with Track Switcher */}
                    {(() => {
                      const activeTrack = dashboardAudioTrackByMed[med.id] || 'prescription';
                      const isPrescriptionTrack = activeTrack === 'prescription';
                      const effectiveAudioUrl = isPrescriptionTrack
                        ? (med.audio_url || (isMedEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3'))
                        : (med.reminder_audio_url || med.audio_url || (isMedEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3'));

                      const title = isPrescriptionTrack
                        ? (med.instruction_source === 'recorded'
                          ? `Pharmacist Custom Recording (${medLangLabel})`
                          : `Full Prescription Instructions (${medLangLabel})`)
                        : `Daily Dose Reminder (${medLangLabel})`;

                      const spokenText = isPrescriptionTrack
                        ? (med.instruction_source === 'recorded'
                          ? undefined
                          : isMedEnglish
                            ? `This is your complete MediCall prescription for ${med.drug_name}. Take ${med.dosage_label || '1 tablet'} ${med.frequency_label || 'twice daily'} ${med.timing_label || 'after meals'}. Your treatment course is ${med.is_chronic ? 'ongoing chronic management' : `${med.duration_days} days`}. For questions or side effects, press 0 anytime to reach your pharmacist.`
                            : `Saa nnuro yi yɛ ${med.drug_name}. Fa ${med.dosage_label || 'baa baako'} ${med.frequency_label || 'da biara mprenu'} ${med.timing_label || 'sɛ wodidi wie a'}. Nnuro yi bɛkɔ so nnafua ${med.is_chronic ? 'dodoɔ biara' : med.duration_days}. Sɛ worete nka bɔne bi a, mia 0 na kasa kyerɛ wo duruyɛfoɔ.`)
                        : (isMedEnglish
                          ? `Hello ${audioPreviewPatient.name}, this is your MediCall reminder to take your ${med.drug_name} now: ${med.dosage_label || '1 tablet'} ${med.timing_label || 'after meals'}. Press 1 to confirm you have taken it. Press 2 if not taken. Press 9 to repeat, or Press 0 for your pharmacist.`
                          : `Meda wo akye ${audioPreviewPatient.name}, yɛfrɛ wo firi MediCall sɛ yɛbɛkae wo wo nnuro ${med.drug_name}: ${med.dosage_label || 'Fa baa baako'} ${med.timing_label || 'sɛ wodidi wie a'}. Mia 1 sɛ woanom. Mia 2 sɛ woamfa. Mia 9 sɛ wobɛtie bio, anaa mia 0 ma wo duruyɛfoɔ.`);

                      return (
                        <div className="space-y-2.5">
                          {/* Track Switcher */}
                          <div className="flex items-center justify-between">
                            <div className="inline-flex p-1 bg-[#F2F0EC] rounded-xl text-xs gap-1 border border-[#E6E3DB]">
                              <button
                                type="button"
                                onClick={() => setDashboardAudioTrackByMed(prev => ({ ...prev, [med.id]: 'prescription' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${isPrescriptionTrack
                                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                                    : 'text-gray-500 hover:text-gray-800'
                                  }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isPrescriptionTrack ? 'bg-[#70BF2B]' : 'bg-gray-300'}`} />
                                Full Prescription
                                <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">&middot; Helpline</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDashboardAudioTrackByMed(prev => ({ ...prev, [med.id]: 'reminder' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${!isPrescriptionTrack
                                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                                    : 'text-gray-500 hover:text-gray-800'
                                  }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${!isPrescriptionTrack ? 'bg-[#70BF2B]' : 'bg-gray-300'}`} />
                                Dose Reminder
                                <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">&middot; Outbound</span>
                              </button>
                            </div>

                            <span className="text-[11px] text-gray-400 font-medium">
                              {isPrescriptionTrack ? 'Helpline 0308048104' : 'Outbound Call'}
                            </span>
                          </div>

                          <AudioPlayer
                            title={title}
                            language={isMedEnglish ? 'english' : 'twi'}
                            durationSeconds={isPrescriptionTrack ? (med.instruction_source === 'recorded' ? 24 : 18) : 12}
                            spokenText={spokenText}
                            audioUrl={effectiveAudioUrl}
                            appendKeypressTrailer={isPrescriptionTrack && med.instruction_source === 'recorded'}
                          />
                        </div>
                      );
                    })()}
                  </div>
                );
              });
            })()}
          </div>
        </Modal>
      )}
    </>
  );
};
