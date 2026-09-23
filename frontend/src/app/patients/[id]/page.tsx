'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AudioPlayer } from '@/components/patients/AudioPlayer';
import { PrescribeMedicationModal } from '@/components/patients/PrescribeMedicationModal';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import { CallTimeline } from '@/components/patients/CallTimeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  ArrowLeft,
  Plus,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  HeartHandshake,
  Activity,
  Pill,
  Clock,
  CheckCircle,
  Pencil,
  Trash2,
  X,
  Save,
  Stethoscope,
  Calendar,
  FileText,
} from 'lucide-react';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    getPatientById,
    getPatientMedications,
    getPatientLogs,
    loadPatientDetails,
    isLoading: isGlobalLoading,
    error,
    refetch,
    updatePatient,
    deletePatient,
    updateMedication,
    deleteMedication,
  } = useData();

  const patientId = Number(params?.id);
  const patient = getPatientById(patientId);
  const medications = getPatientMedications(patientId);
  const logs = getPatientLogs(patientId);

  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callModalType, setCallModalType] = useState<'reminder' | 'diagnostic'>('reminder');
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScriptByMed, setShowScriptByMed] = useState<Record<string | number, boolean>>({});
  const [audioTrackByMed, setAudioTrackByMed] = useState<Record<number, 'prescription' | 'reminder'>>({});

  // Medication edit/delete state
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ drug_name: string; schedule_times: string; duration_days: number; is_chronic: boolean }>({ drug_name: '', schedule_times: '', duration_days: 7, is_chronic: false });
  const [deletingMedId, setDeletingMedId] = useState<number | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const startEditing = (med: { id: number; drug_name: string; schedule_times: string; duration_days: number; is_chronic: boolean | number }) => {
    setEditingMedId(med.id);
    setEditFields({
      drug_name: med.drug_name,
      schedule_times: med.schedule_times,
      duration_days: med.duration_days,
      is_chronic: Boolean(med.is_chronic),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMedId) return;
    setIsMutating(true);
    try {
      await updateMedication(patientId, editingMedId, editFields);
      setToastMessage('Medication updated successfully.');
      setTimeout(() => setToastMessage(null), 3500);
      setEditingMedId(null);
    } catch (err) {
      setToastMessage(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMedId) return;
    setIsMutating(true);
    try {
      await deleteMedication(patientId, deletingMedId);
      setToastMessage('Medication deleted.');
      setTimeout(() => setToastMessage(null), 3500);
      setDeletingMedId(null);
    } catch (err) {
      setToastMessage(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsMutating(false);
    }
  };

  // Derive latest call info dynamically from completed calls (ignore future scheduled reminders)
  const completedLog = logs?.find(
    (l) => l.actual_call_time || (l.outcome && l.outcome !== 'pending' && l.outcome !== 'uncalled')
  );

  const rawLastCallTime = completedLog
    ? completedLog.actual_call_time || completedLog.scheduled_time
    : patient?.last_call_time;

  const formatLastCallTime = (timestamp?: string | null) => {
    if (!timestamp) return 'No calls yet';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return timestamp;
    }
  };

  const lastCallTimeDisplay = rawLastCallTime ? formatLastCallTime(rawLastCallTime) : 'No calls yet';
  const lastCallOutcomeDisplay = completedLog?.outcome || (rawLastCallTime && patient?.last_call_outcome ? patient.last_call_outcome : 'uncalled');

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('enrolled') === 'true') {
      setToastMessage(`Patient ${patient ? patient.name : 'profile'} enrolled successfully! Prescribe their first medication regimen below.`);
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, patient?.name]);

  useEffect(() => {
    if (patientId) {
      loadPatientDetails(patientId);
      const interval = setInterval(() => {
        loadPatientDetails(patientId);
      }, 4000);
      return () => clearInterval(interval);
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditPatientOpen(true)}
              className="p-2.5 text-gray-500 hover:text-[#55941E] hover:bg-[#F0F9EB] border border-gray-200 hover:border-[#70BF2B]/40 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Edit patient profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeletePatientOpen(true)}
              className="p-2.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Delete patient profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Button
              variant="secondary"
              icon={<Phone className="w-4 h-4 text-[#70BF2B]" />}
              onClick={() => {
                setCallModalType('reminder');
                setIsCallModalOpen(true);
              }}
              className="border-[#70BF2B]/40 hover:bg-[#F0F9EB] text-[#55941E]"
            >
              Call Patient Now
            </Button>
            <Button
              variant="secondary"
              icon={<Stethoscope className="w-4 h-4 text-amber-600" />}
              onClick={() => {
                setCallModalType('diagnostic');
                setIsCallModalOpen(true);
              }}
              className="border-amber-200 hover:bg-amber-50 text-amber-800"
            >
              Diagnostic Call
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
        <div
          className={`rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between ${
            patient.adherence_rate !== null
              ? patient.adherence_rate >= 80
                ? 'bg-[#70BF2B] text-white'
                : 'bg-amber-600 text-white'
              : 'bg-white border border-[#ECECEC]'
          }`}
        >
          {patient.adherence_rate !== null && (
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none blur-lg" />
          )}
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                patient.adherence_rate !== null ? 'text-white/90' : 'text-gray-400'
              }`}
            >
              Adherence Rate
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                patient.adherence_rate !== null ? 'bg-white/20 text-white' : 'bg-[#F0F9EB] text-[#70BF2B]'
              }`}
            >
              <Activity className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10">
            <div
              className={`text-3xl font-bold tracking-tight ${
                patient.adherence_rate !== null ? 'text-white' : 'text-gray-900'
              }`}
            >
              {patient.adherence_rate !== null ? `${patient.adherence_rate}%` : '--'}
            </div>
            <p
              className={`text-xs mt-1 font-medium ${
                patient.adherence_rate !== null ? 'text-white/85' : 'text-gray-500'
              }`}
            >
              {patient.adherence_rate !== null
                ? patient.adherence_rate >= 80
                  ? 'Above clinical target (80%)'
                  : 'Needs attention'
                : 'New patient — awaiting first call'}
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
              {lastCallTimeDisplay}
            </div>
            <div className="mt-1">
              <Badge
                variant="outcome"
                outcome={lastCallOutcomeDisplay as any}
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
                className="bg-white border border-[#ECECEC] rounded-2xl p-6 space-y-5 hover:border-gray-300 transition-colors shadow-xs relative"
              >
                {/* Delete Confirmation Overlay */}
                {deletingMedId === med.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-gray-900">Delete {med.drug_name}?</h4>
                      <p className="text-xs text-gray-500 mt-1">This will remove the medication and all its scheduled calls. This cannot be undone.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeletingMedId(null)}
                        disabled={isMutating}
                      >
                        Cancel
                      </Button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isMutating}
                        className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
                      >
                        {isMutating ? 'Deleting...' : 'Delete medication'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Medication title + Status + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingMedId === med.id ? (
                      <input
                        type="text"
                        value={editFields.drug_name}
                        onChange={(e) => setEditFields((f) => ({ ...f, drug_name: e.target.value }))}
                        className="text-base font-bold text-gray-900 tracking-tight w-full px-2.5 py-1.5 rounded-lg border border-[#70BF2B] bg-[#FAFFF6] focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          {med.drug_name}
                        </h3>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1.5">
                      <span>{med.dosage_label || '1 tablet'}</span>
                      <span className="text-gray-300">&middot;</span>
                      <span>{med.frequency_label || 'Twice daily'}</span>
                      <span className="text-gray-300">&middot;</span>
                      <span>{med.timing_label || 'After meals'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingMedId === med.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingMedId(null)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isMutating}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(med)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#55941E] hover:bg-[#F0F9EB] transition-colors"
                          title="Edit medication"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMedId(med.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Regimen timings & duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-[#FAF9F6] border border-[#ECEAE4] rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E6E0] flex items-center justify-center text-[#55941E] shadow-2xs shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
                        Daily Call Schedule
                      </span>
                      {editingMedId === med.id ? (
                        <input
                          type="text"
                          value={editFields.schedule_times}
                          onChange={(e) => setEditFields((f) => ({ ...f, schedule_times: e.target.value }))}
                          className="font-mono font-semibold text-gray-900 text-xs w-full px-2 py-0.5 rounded border border-[#70BF2B] bg-white mt-0.5"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-gray-800 text-xs">
                          {med.schedule_times ? med.schedule_times.replace(/,/g, '  ·  ') : '08:00'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#ECEAE4] rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E6E0] flex items-center justify-center text-purple-600 shadow-2xs shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
                        Course Duration
                      </span>
                      {editingMedId === med.id ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            disabled={editFields.is_chronic}
                            value={editFields.is_chronic ? 90 : editFields.duration_days}
                            onChange={(e) => setEditFields((f) => ({ ...f, duration_days: Number(e.target.value) }))}
                            className="w-16 px-1.5 py-0.5 rounded border border-[#70BF2B] bg-white text-xs font-medium"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editFields.is_chronic}
                              onChange={(e) => setEditFields((f) => ({ ...f, is_chronic: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded text-[#70BF2B]"
                            />
                            Chronic
                          </label>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-800 text-xs">
                          {med.is_chronic ? 'Chronic / Ongoing' : `${med.duration_days} days`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Single Elegant Audio Player with Track Switcher */}
                <div className="pt-2.5 border-t border-[#F0EFEB] space-y-2.5">
                  {(() => {
                    const isMedEnglish =
                      med.language === 'english' ||
                      Boolean(med.audio_url?.includes('_en')) ||
                      Boolean(med.audio_url?.includes('default-reminder-en'));
                    const medLangLabel = isMedEnglish ? 'English' : 'Twi';
                    const activeTrack = audioTrackByMed[med.id] || 'prescription';
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
                          ? `This is your complete MediCall prescription for ${med.drug_name}. Take ${med.dosage_label || '1 tablet'} ${med.frequency_label || 'twice daily'} ${med.timing_label || 'after meals'}. Your treatment course is ${med.is_chronic ? 'ongoing chronic management' : `${med.duration_days} days`}. Press 9 to repeat, or Press 0 for your pharmacist.`
                          : `Saa nnuro yi yɛ ${med.drug_name}. Fa ${med.dosage_label || 'baa baako'} ${med.frequency_label || 'da biara mprenu'} ${med.timing_label || 'sɛ wodidi wie a'}. Nnuro yi bɛkɔ so nnafua ${med.is_chronic ? 'dodoɔ biara' : med.duration_days}. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.`)
                      : (isMedEnglish
                          ? `Hello ${patient.name}, this is your MediCall reminder to take your ${med.drug_name} now: ${med.dosage_label || '1 tablet'} ${med.timing_label || 'after meals'}. Press 1 to confirm you have taken it. Press 2 if not taken. Press 9 to repeat, or Press 0 for your pharmacist.`
                          : `Meda wo akye ${patient.name}, yɛfrɛ wo firi MediCall sɛ yɛbɛkae wo wo nnuro ${med.drug_name}: ${med.dosage_label || 'Fa baa baako'} ${med.timing_label || 'sɛ wodidi wie a'}. Mia 1 sɛ woanom. Mia 2 sɛ woamfa. Mia 9 sɛ wobɛtie bio, anaa mia 0 ma wo duruyɛfoɔ.`);

                    return (
                      <div className="space-y-2.5">
                        {/* Track Segment Switcher & Script Action */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex p-1 bg-[#F2F0EC] rounded-xl text-xs gap-1 border border-[#E6E3DB]">
                            <button
                              type="button"
                              onClick={() => setAudioTrackByMed(prev => ({ ...prev, [med.id]: 'prescription' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                isPrescriptionTrack
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
                              onClick={() => setAudioTrackByMed(prev => ({ ...prev, [med.id]: 'reminder' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                !isPrescriptionTrack
                                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${!isPrescriptionTrack ? 'bg-[#70BF2B]' : 'bg-gray-300'}`} />
                              Dose Reminder
                              <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">&middot; Outbound</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowScriptByMed((prev) => ({
                              ...prev,
                              [`script-${med.id}`]: !prev[`script-${med.id}`]
                            }))}
                            className="text-xs text-gray-500 hover:text-[#55941E] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {showScriptByMed[`script-${med.id}`] ? 'Hide script' : 'View spoken script'}
                          </button>
                        </div>

                        {/* Single Unified Audio Player */}
                        <AudioPlayer
                          title={title}
                          language={isMedEnglish ? 'english' : 'twi'}
                          durationSeconds={isPrescriptionTrack ? (med.instruction_source === 'recorded' ? 24 : 18) : 12}
                          spokenText={spokenText}
                          audioUrl={effectiveAudioUrl}
                          appendKeypressTrailer={isPrescriptionTrack && med.instruction_source === 'recorded'}
                        />

                        {/* Expandable Spoken Script */}
                        {showScriptByMed[`script-${med.id}`] && (
                          <div className="p-3 bg-[#FAF9F6] border border-[#ECEAE4] rounded-xl space-y-1.5 text-xs text-gray-600 animate-in fade-in">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-gray-700">
                                {isPrescriptionTrack ? `Full Prescription Instruction (${medLangLabel})` : `Outbound Reminder Audio Prompt (${medLangLabel})`}
                              </span>
                              <span className="font-mono text-gray-400 text-[10px]">
                                {isPrescriptionTrack ? 'Helpline 0308048104' : `Schedule: ${med.schedule_times || 'Daily'}`}
                              </span>
                            </div>
                            <p className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-100 font-normal leading-relaxed text-xs">
                              {spokenText || 'Audio provided by pharmacist voice note.'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
        patientLanguage={patient.preferred_language}
      />

      {/* Trigger Live Call Modal */}
      <TriggerCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultPatientId={patient.id}
        defaultCallType={callModalType}
      />

      {/* Edit Patient Modal */}
      {patient && (
        <EditPatientModal
          isOpen={isEditPatientOpen}
          onClose={() => setIsEditPatientOpen(false)}
          patient={patient}
          onSuccess={(updated) => {
            loadPatientDetails(patient.id);
            setToastMessage(`Patient profile for "${updated.name}" updated successfully.`);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={isDeletePatientOpen}
        onClose={() => setIsDeletePatientOpen(false)}
        title={`Delete patient "${patient?.name}"?`}
        description="This action cannot be undone. All active prescriptions, voice schedules, and call timeline logs will be permanently deleted."
      >
        <div className="pt-2 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
            <Trash2 className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Permanent Deletion Warning</p>
              <p className="mt-0.5 text-rose-700">
                Removing <strong>{patient?.name}</strong> ({patient?.phone_number}) will stop all scheduled automated reminder calls and remove their adherence record.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeletePatientOpen(false)}
              disabled={isDeletingPatient}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={isDeletingPatient}
              onClick={async () => {
                if (!patient) return;
                setIsDeletingPatient(true);
                try {
                  await deletePatient(patient.id);
                  setIsDeletePatientOpen(false);
                  router.push('/patients');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Failed to delete patient';
                  alert(msg);
                } finally {
                  setIsDeletingPatient(false);
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeletingPatient ? 'Deleting patient...' : 'Delete patient'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
