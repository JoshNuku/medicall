'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { dictatePrescriptionApi } from '@/lib/api';
import {
  Mic,
  Square,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pill,
  User,
  Phone,
  Calendar,
  X,
  Upload,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: number;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
}) => {
  const router = useRouter();
  const { templates, enrollPatient, prescribeMedication, refetch } = useData();

  // Mode & Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Assistant & Extraction state
  const [step, setStep] = useState<'record' | 'review' | 'success'>('record');
  const [rawTranscript, setRawTranscript] = useState('');
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isExistingPatient, setIsExistingPatient] = useState(false);

  // Extracted Form State
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+233 ');
  const [preferredLanguage, setPreferredLanguage] = useState<'english' | 'twi'>('english');
  const [caregiverPhone, setCaregiverPhone] = useState('');

  const [drugName, setDrugName] = useState('');
  const [dosageId, setDosageId] = useState<number>(1);
  const [frequencyId, setFrequencyId] = useState<number>(11);
  const [timingId, setTimingId] = useState<number>(15);
  const [scheduleTimes, setScheduleTimes] = useState('08:00, 14:00, 20:00');
  const [durationDays, setDurationDays] = useState(7);
  const [isChronic, setIsChronic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('record');
      setIsRecording(false);
      setRecordDuration(0);
      setIsProcessing(false);
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setRawTranscript('');
      setAssumptions([]);
      setMissingFields([]);
      setIsExistingPatient(false);
      setPatientName('');
      setPhoneNumber('+233 ');
      setCaregiverPhone('');
      setDrugName('');
      setDosageId(1);
      setFrequencyId(11);
      setTimingId(15);
      setScheduleTimes('08:00, 14:00, 20:00');
      setDurationDays(7);
      setIsChronic(false);
    } else {
      stopRecording();
    }
  }, [isOpen]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        // Trigger processing
        processAudioBlob(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please check browser permissions or upload an audio file.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    processAudioBlob(file);
  };

  const processAudioBlob = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const langCode = preferredLanguage === 'english' ? 'en' : 'twi';
      const res = await dictatePrescriptionApi(blob, langCode, defaultPatientId);
      const data = res.data;

      if (!data) {
        throw new Error('No data received from voice processor.');
      }

      setRawTranscript(data.raw_transcript || res.transcript || '');
      setAssumptions(data.assumptions || []);
      setMissingFields(data.missing_fields || []);

      // Auto-populate patient details
      if (data.patient) {
        if (data.patient.name) setPatientName(data.patient.name);
        if (data.patient.phone_number) setPhoneNumber(data.patient.phone_number);
        if (data.patient.preferred_language) {
          setPreferredLanguage(data.patient.preferred_language === 'english' ? 'english' : 'twi');
        }
        if (data.patient.caregiver_phone) setCaregiverPhone(data.patient.caregiver_phone);
        if (data.patient.is_existing) setIsExistingPatient(true);
      }

      // Auto-populate medication details
      if (data.medication) {
        if (data.medication.drug_name) setDrugName(data.medication.drug_name);
        if (data.medication.dosage_template_id) setDosageId(data.medication.dosage_template_id);
        if (data.medication.frequency_template_id) setFrequencyId(data.medication.frequency_template_id);
        if (data.medication.timing_template_id) setTimingId(data.medication.timing_template_id);
        if (data.medication.schedule_times) setScheduleTimes(data.medication.schedule_times);
        if (data.medication.duration_days) setDurationDays(data.medication.duration_days);
        if (data.medication.is_chronic !== undefined) setIsChronic(data.medication.is_chronic);
      }

      setStep('review');
    } catch (err: any) {
      console.error('Dictation processing error:', err);
      setError(err.message || 'Failed to process voice dictation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) {
      setError('Please provide a medication name.');
      return;
    }
    if (!isExistingPatient && !defaultPatientId && (!patientName.trim() || phoneNumber.trim().length < 9)) {
      setError('Patient name and valid phone number are required to enroll.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let targetPatientId = defaultPatientId;

      // 1. Create or match patient if not already existing
      if (!targetPatientId) {
        const patientRes = await enrollPatient({
          name: patientName.trim(),
          phone_number: phoneNumber.trim(),
          preferred_language: preferredLanguage,
          caregiver_phone: caregiverPhone.trim() || undefined,
        });
        targetPatientId = patientRes?.id;
      }

      if (!targetPatientId) {
        throw new Error('Could not determine patient ID.');
      }

      // 2. Prescribe Medication
      await prescribeMedication(targetPatientId, {
        drug_name: drugName.trim(),
        instruction_source: 'template',
        dosage_template_id: dosageId,
        frequency_template_id: frequencyId,
        timing_template_id: timingId,
        schedule_times: scheduleTimes.trim(),
        duration_days: durationDays,
        is_chronic: isChronic,
        language: preferredLanguage,
      });

      await refetch();
      setStep('success');
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save patient & prescription.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter templates
  const dosages = templates.filter((t) => t.category === 'dosage');
  const frequencies = templates.filter((t) => t.category === 'frequency');
  const timings = templates.filter((t) => t.category === 'timing');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                AI Voice Prescription Assistant
              </h2>
              <p className="text-xs text-gray-500">
                Dictate prescription details naturally; AI extracts and fills the form for you.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: VOICE RECORDING STUDIO */}
          {step === 'record' && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-5">
              {/* Language Selection Selector */}
              <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => setPreferredLanguage('english')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    preferredLanguage === 'english'
                      ? 'bg-white text-gray-900 shadow-xs border border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLanguage('twi')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    preferredLanguage === 'twi'
                      ? 'bg-white text-emerald-900 shadow-xs border border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Asante Twi
                </button>
              </div>

              {/* Pulsing Mic Visualizer */}
              <div className="relative flex items-center justify-center pt-2">
                {isRecording && (
                  <>
                    <div className="absolute w-36 h-36 rounded-full bg-emerald-400/20 animate-ping" />
                    <div className="absolute w-28 h-28 rounded-full bg-emerald-500/30 animate-pulse" />
                  </>
                )}

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform shadow-xl cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-600 scale-105 shadow-rose-500/30'
                      : isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105 shadow-emerald-600/30'
                  }`}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-7 h-7 fill-white" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status Message & Timer */}
              <div>
                {isProcessing ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Processing Audio...</p>
                    <p className="text-xs text-gray-500">Transcribing speech and extracting prescription schema...</p>
                  </div>
                ) : isRecording ? (
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Listening: {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click square button when done speaking</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Click to start dictating</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Speak naturally: patient name, phone number, medication, frequency, and times.
                    </p>
                  </div>
                )}
              </div>

              {/* Spoken Prompt Example */}
              {!isRecording && !isProcessing && (
                <div className="w-full max-w-lg bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Example Dictation (English):</span>
                  </div>
                  <p className="text-xs text-gray-600 italic bg-white p-3 rounded-xl border border-gray-100 shadow-sm leading-relaxed">
                    &ldquo;Patient is Samuel Boateng, phone 0536287642. I am prescribing 1 tablet of Paracetamol three times daily after meals for 7 days.&rdquo;
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                    <span>Or upload a pre-recorded file:</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 gap-1.5 text-xs text-gray-700"
                    >
                      <Upload className="w-3.5 h-3.5 text-gray-500" />
                      Upload Audio
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & CONFIRM EXTRACTED FORM */}
          {step === 'review' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Spoken Transcript Card */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    AI Spoken Transcript
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('record')}
                    className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Record Again
                  </button>
                </div>
                <p className="text-xs text-gray-800 bg-white p-3 rounded-xl border border-emerald-100/80 leading-relaxed font-sans shadow-xs">
                  &ldquo;{rawTranscript}&rdquo;
                </p>

                {/* Assumptions / Hints */}
                {assumptions.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {assumptions.map((assump, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-medium"
                      >
                        <Info className="w-3 h-3 text-amber-600 shrink-0" />
                        {assump}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 1: Patient Information */}
              <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                    1. Patient Information
                  </h3>
                  {isExistingPatient && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Existing Patient Matched
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Samuel Mensah"
                      required
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone Number (Ghana +233)
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+233XXXXXXXXX"
                      required
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Call Reminder Language
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value as 'english' | 'twi')}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="english">English (Standard Voice)</option>
                      <option value="twi">Asante Twi (Khaya Voice)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Caregiver Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={caregiverPhone}
                      onChange={(e) => setCaregiverPhone(e.target.value)}
                      placeholder="+233XXXXXXXXX"
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Medication & Schedule */}
              <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/30">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-gray-600" />
                  2. Medication & Schedule Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Drug Name & Strength
                    </label>
                    <input
                      type="text"
                      value={drugName}
                      onChange={(e) => setDrugName(e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      required
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Dosage Template
                    </label>
                    <select
                      value={dosageId}
                      onChange={(e) => setDosageId(Number(e.target.value))}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {dosages.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label_english}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequencyId}
                      onChange={(e) => setFrequencyId(Number(e.target.value))}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {frequencies.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label_english}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Timing / Meal Relation
                    </label>
                    <select
                      value={timingId}
                      onChange={(e) => setTimingId(Number(e.target.value))}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {timings.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label_english}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Call Reminder Times (24h)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={scheduleTimes}
                        onChange={(e) => setScheduleTimes(e.target.value)}
                        placeholder="08:00, 14:00, 20:00"
                        required
                        className="w-full h-9 px-3 text-xs font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={isChronic}
                        onChange={(e) => setIsChronic(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <span>Chronic / Long-term Medication</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setStep('record')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px] gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Prescription Saved Successfully!</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Patient <strong>{patientName}</strong> has been enrolled with <strong>{drugName}</strong>. Automatic voice reminder calls are scheduled.
                </p>
              </div>
              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setStep('record');
                    onClose();
                  }}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setStep('record');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Dictate Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
