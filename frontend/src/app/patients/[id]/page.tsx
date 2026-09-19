'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AudioPlayer } from '@/components/patients/AudioPlayer';
import { PrescribeMedicationModal } from '@/components/patients/PrescribeMedicationModal';
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

          <div>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsPrescribeOpen(true)}
            >
              Prescribe medication
            </Button>
          </div>
        </div>
      </div>

      {/* Main Patient Summary Cards (3 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Adherence */}
        <div className="bg-white border border-[#EBEAE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Adherence
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-gray-950 tracking-tight">
            {patient.adherence_rate}%
          </div>
          <p className="text-xs text-emerald-700 mt-1 font-medium">
            {patient.adherence_rate >= 80 ? 'Above clinical target' : 'Needs attention'}
          </p>
        </div>

        {/* Current Medications */}
        <div className="bg-white border border-[#EBEAE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Current medications
            </span>
            <Pill className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-bold text-gray-950 tracking-tight">
            {medications.length}
          </div>
          <p className="text-xs text-gray-500 mt-1 font-normal">
            Active adherence regimens
          </p>
        </div>

        {/* Last Call */}
        <div className="bg-white border border-[#EBEAE5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Last call
            </span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-gray-950 tracking-tight">
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
            icon={<Pill className="w-6 h-6 text-emerald-600" />}
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
                className="bg-white border border-[#EBEAE5] rounded-2xl p-6 space-y-5 hover:border-gray-300 transition-colors shadow-xs"
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant="status" status="active" size="sm" />
                    <Badge variant="source" source={med.instruction_source} size="sm" />
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
    </div>
  );
}
