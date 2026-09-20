'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AudioPlayer } from '@/components/patients/AudioPlayer';
import { PrescribeMedicationModal } from '@/components/patients/PrescribeMedicationModal';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import { CallTimeline } from '@/components/patients/CallTimeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  ArrowLeft,
  Plus,
  Phone,
  HeartHandshake,
  Activity,
  Pill,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function PatientDetailPage() {
  const params = useParams();
  const {
    getPatientById,
    getPatientMedications,
    getPatientLogs,
    loadPatientDetails,
    isLoading: isGlobalLoading,
    error,
    refetch,
  } = useData();

  const patientId = Number(params?.id);
  const patient = getPatientById(patientId);
  const medications = getPatientMedications(patientId);
  const logs = getPatientLogs(patientId);

  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadPatientDetails(patientId);
    }
  }, [patientId, loadPatientDetails]);

  if (isGlobalLoading && !patient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto mb-2">
          <Pill className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Patient not found</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          The requested patient profile (ID #{patientId}) does not exist in the database.
        </p>
        <Link href="/patients">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to patients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Top back navigation */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to patients</span>
        </Link>

        {/* Patient Identity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
                {patient.name}
              </h1>
              <Badge variant="status" status={patient.status} />
              <Badge variant="language" language={patient.preferred_language} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2 font-mono">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {patient.phone_number}
              </span>
              {patient.caregiver_phone && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <HeartHandshake className="w-3.5 h-3.5 text-gray-400" />
                  Caregiver: {patient.caregiver_phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              icon={<Phone className="w-4 h-4 text-[#70BF2B]" />}
              onClick={() => setIsCallModalOpen(true)}
              className="border-[#70BF2B]/40 hover:bg-[#F0F9EB] text-[#55941E]"
            >
              Call Patient Now
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsPrescribeOpen(true)}
              className="bg-[#70BF2B] hover:bg-[#62A825] text-white"
            >
              Prescribe medication
            </Button>
          </div>
        </div>
      </div>

      {/* Main Patient Summary Cards (3 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Adherence Hero Card */}
        <div className="bg-[#70BF2B] text-white rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none blur-lg" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              Adherence Rate
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold tracking-tight text-white">
              {patient.adherence_rate}%
            </div>
            <p className="text-xs text-white/85 mt-1 font-medium">
              {patient.adherence_rate >= 80 ? 'Above clinical target (80%)' : 'Needs attention'}
            </p>
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Current Medications
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {medications.length}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-normal">
              Active adherence regimens
            </p>
          </div>
        </div>

        {/* Last Call */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Last Call Result
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F0F9EB] flex items-center justify-center text-[#70BF2B]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {patient.last_call_time || 'Today, 08:02'}
            </div>
            <div className="mt-1">
              <Badge
                variant="outcome"
                outcome={patient.last_call_outcome || 'confirmed'}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Current Medications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              Current medications
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Active regimens with automated voice reminder schedules.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsPrescribeOpen(true)}
          >
            Add medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-6 h-6 text-[#70BF2B]" />}
            title="No active medications"
            description="Prescribe a medication regimen with verified Twi templates or recorded audio to start reminder calls."
            actionText="+ Prescribe medication"
            onAction={() => setIsPrescribeOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {medications.map((med) => (
              <div
                key={med.id}
                className="bg-white border border-[#ECECEC] rounded-2xl p-6 space-y-5 hover:border-gray-300 transition-colors shadow-xs"
              >
                {/* Medication title + Status + Source badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                      {med.drug_name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      {med.dosage_label || '1 tablet'} &middot; {med.frequency_label || 'Twice daily'} &middot; {med.timing_label || 'After meals'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="status" status="active" size="sm" />
                  </div>
                </div>

                {/* Regimen timings & duration */}
                <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
                      Daily Call Schedule
                    </span>
                    <span className="font-mono font-bold text-gray-900 text-sm">
                      {med.schedule_times ? med.schedule_times.replace(/,/g, '  \u00B7  ') : '08:00'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
                      Course Duration
                    </span>
                    <span className="font-medium text-gray-800">
                      {med.is_chronic ? 'Chronic / Ongoing' : `${med.duration_days} days`}
                    </span>
                  </div>
                </div>

                {/* Custom Audio Player with [Twi] badge */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Automated Voice Prompt Audio
                  </div>
                  <AudioPlayer
                    title={`${med.drug_name} (${patient.preferred_language === 'twi' ? 'Twi' : 'English'})`}
                    language={patient.preferred_language}
                    durationSeconds={18}
                    audioUrl={med.audio_url}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adherence History & Call Timeline */}
      <CallTimeline logs={logs} />

      {/* Prescribe Medication Modal */}
      <PrescribeMedicationModal
        isOpen={isPrescribeOpen}
        onClose={() => {
          setIsPrescribeOpen(false);
          loadPatientDetails(patient.id);
        }}
        onSuccess={(drugName) => {
          setToastMessage(`Prescription "${drugName}" saved and automated voice schedule activated.`);
          setTimeout(() => setToastMessage(null), 4500);
        }}
        patientId={patient.id}
        patientName={patient.name}
      />

      {/* Trigger Live Call Modal */}
      <TriggerCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultPatientId={patient.id}
      />
    </div>
  );
}
