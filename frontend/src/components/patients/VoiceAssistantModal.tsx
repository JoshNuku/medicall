'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Pill,
  User,
  X,
  Upload,
  Info
} from 'lucide-react';

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
  const { patients, templates, enrollPatient, prescribeMedication, refetch } = useData();

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
  const [matchedPatientId, setMatchedPatientId] = useState<number | null>(null);

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
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [isSheetDragging, setIsSheetDragging] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSheetHeight(null);
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
      setMatchedPatientId(defaultPatientId || null);
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
  }, [isOpen, defaultPatientId]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle escape key and lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const scrollY = window.scrollY;
    const originalStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = originalStyles.htmlOverflow;
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.width = originalStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualType });
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
        if (data.patient.id) setMatchedPatientId(data.patient.id);
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

    let targetPatientId = defaultPatientId || matchedPatientId;

    // If still not identified, search patients list by normalized phone number
    if (!targetPatientId && patients && phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      const matched = patients.find(
        (p) => p.phone_number.replace(/[\s\-\(\)]/g, '') === cleanPhone
      );
      if (matched) {
        targetPatientId = matched.id;
      }
    }

    if (!targetPatientId && !isExistingPatient && (!patientName.trim() || phoneNumber.trim().length < 9)) {
      setError('Patient name and valid phone number are required to enroll.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Create patient only if not already existing in system
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

  const handleSheetDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) ||
        window.matchMedia('(min-width: 768px)').matches) return;
    dragStartRef.current = {
      y: event.clientY,
      height: event.currentTarget.parentElement?.getBoundingClientRect().height ?? window.innerHeight * 0.88,
    };
    setIsSheetDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const nextHeight = dragStartRef.current.height + dragStartRef.current.y - event.clientY;
    setSheetHeight(Math.min(window.innerHeight, Math.max(window.innerHeight * 0.45, nextHeight)));
  };

  const handleSheetDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const finalHeight = Math.min(
      window.innerHeight,
      Math.max(
        window.innerHeight * 0.45,
        dragStartRef.current.height + dragStartRef.current.y - event.clientY,
      ),
    );
    const dragDistance = event.clientY - dragStartRef.current.y;
    const startHeight = dragStartRef.current.height;
    dragStartRef.current = null;
    setIsSheetDragging(false);
    setSheetHeight(finalHeight);
    const heightRatio = finalHeight / window.innerHeight;
    if (heightRatio >= 0.92) setSheetHeight(window.innerHeight);
    else if (dragDistance > 0 && finalHeight < startHeight * 0.8) onClose();
    else setSheetHeight(window.innerHeight * 0.88);
  };

  // Filter templates
  const dosages = templates.filter((t) => t.category === 'dosage');
  const frequencies = templates.filter((t) => t.category === 'frequency');
  const timings = templates.filter((t) => t.category === 'timing');

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close voice prescription assistant"
      />

      <div className="absolute inset-0 flex items-end justify-center md:justify-end">
        <section
          className={`voice-assistant-sheet relative flex w-full flex-col overflow-hidden rounded-t-3xl border border-[#EBEAE5] bg-white shadow-2xl animate-slide-in-up ${isSheetDragging ? 'sheet-dragging' : ''} md:max-h-full md:max-w-xl md:rounded-none md:border-y-0 md:border-r-0 md:animate-slide-in-right`}
          style={sheetHeight === null ? undefined : { height: `${sheetHeight}px` }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-pane-title"
        >
          <div
            className="mx-auto flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing md:hidden"
            onPointerDown={handleSheetDragStart}
            onPointerMove={handleSheetDragMove}
            onPointerUp={handleSheetDragEnd}
            onPointerCancel={() => {
              dragStartRef.current = null;
              setIsSheetDragging(false);
              setSheetHeight(window.innerHeight * 0.88);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') setSheetHeight(window.innerHeight);
              if (event.key === 'ArrowDown') {
                if (sheetHeight && sheetHeight >= window.innerHeight * 0.92) {
                  setSheetHeight(window.innerHeight * 0.88);
                }
                else onClose();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Drag up to expand or drag down to close"
          >
            <span className="h-1 w-10 rounded-full bg-[#D8D8D2]" />
          </div>
          
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-[#EBEAE5] flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="voice-pane-title" className="text-sm font-semibold text-neutral-900 tracking-tight">
                    Voice Prescription Assistant
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F9EB] text-[#447817] border border-[#70BF2B]/20">
                    AI
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {step === 'record'
                    ? 'Dictate prescription details or upload audio'
                    : step === 'review'
                    ? 'Review extracted fields before confirming'
                    : 'Prescription complete'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-[#F5F4F0] transition-colors cursor-pointer"
              aria-label="Close voice prescription assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* STEP 1: MINIMALIST VOICE RECORDING PANE */}
            {step === 'record' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
                {/* Language Selection Segmented Control */}
                <div className="inline-flex items-center p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/70 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('english')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      preferredLanguage === 'english'
                        ? 'bg-white text-[#447817] shadow-2xs border border-[#70BF2B]/30'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('twi')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      preferredLanguage === 'twi'
                        ? 'bg-white text-[#447817] shadow-2xs border border-[#70BF2B]/30'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <span>Asante Twi</span>
                  </button>
                </div>

                {/* Tactile Microphone & Recording Stage */}
                <div className="relative flex flex-col items-center justify-center py-4">
                  {isRecording ? (
                    <div className="relative flex flex-col items-center justify-center">
                      {/* Pastel Pink Halo */}
                      <div className="w-32 h-32 rounded-full bg-rose-100/70 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-rose-200/40 animate-ping" />
                        <button
                          type="button"
                          onClick={stopRecording}
                          disabled={isProcessing}
                          className="relative w-20 h-20 rounded-full flex items-center justify-center text-white bg-rose-500 hover:bg-rose-600 transition-all transform shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95 border-2 border-white"
                          aria-label="Stop recording"
                        >
                          <Square className="w-7 h-7 fill-white text-white rounded-xs" />
                        </button>
                      </div>

                      {/* Equalizer Waveform beneath button */}
                      <div className="flex items-center gap-1 h-5 mt-4">
                        {[40, 70, 100, 60, 95, 50, 85].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 bg-rose-500 rounded-full animate-wave-bar"
                            style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center justify-center">
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isProcessing}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform shadow-md cursor-pointer border-3 border-white ${
                          isProcessing
                            ? 'bg-neutral-800 cursor-not-allowed shadow-neutral-800/20'
                            : 'bg-[#70BF2B] hover:bg-[#62A825] hover:scale-105 shadow-[#70BF2B]/30 ring-4 ring-[#70BF2B]/15 active:scale-95'
                        }`}
                        aria-label="Start recording"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-8 h-8 animate-spin text-white" />
                        ) : (
                          <Mic className="w-8 h-8 text-white stroke-[2.2]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Message & Live Duration Counter */}
                <div>
                  {isProcessing ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-neutral-900 flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#55941E]" />
                        Processing Audio...
                      </p>
                      <p className="text-xs text-neutral-500">Transcribing speech and extracting prescription data</p>
                    </div>
                  ) : isRecording ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-rose-50 border border-rose-200/80 text-rose-600 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Listening: {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                      </div>
                      <p className="text-xs text-neutral-500">Click the red square button when done speaking</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-neutral-900">Click to start dictating</h3>
                      <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                        Speak naturally: patient name, phone number, medication, frequency, and times.
                      </p>
                    </div>
                  )}
                </div>

                {/* Spoken Prompt Example & File Upload */}
                {!isRecording && !isProcessing && (
                  <div className="w-full bg-neutral-50/80 border border-neutral-200/60 rounded-2xl p-4 text-left space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      <Info className="w-3.5 h-3.5 text-[#55941E] shrink-0" />
                      <span>Example Dictation ({preferredLanguage === 'english' ? 'English' : 'Asante Twi'}):</span>
                    </div>
                    <p className="text-xs text-neutral-700 italic bg-white p-3 rounded-xl border border-neutral-200/50 shadow-2xs leading-relaxed font-sans">
                      {preferredLanguage === 'english'
                        ? '“Patient is Samuel Boateng, phone 0536287642. I am prescribing 1 tablet of Paracetamol three times daily after meals for 7 days.”'
                        : '“Yarefoɔ no din de Samuel Boateng, n’ahemfie fon nɔma ne 0536287642. Ɔbɛnom Paracetamol 500mg borɔfo baako mprɛnsa da biara.”'}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-200/50">
                      <span>Or upload a pre-recorded audio file:</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-white hover:text-neutral-900 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-neutral-500" />
                        Upload Audio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: MINIMALIST REVIEW & CONFIRM FORM */}
            {step === 'review' && (
              <form id="voice-assistant-form" onSubmit={handleSave} className="space-y-5">
                {/* Spoken Transcript Card */}
                <div className="bg-neutral-50 border border-neutral-200/70 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#55941E]" />
                      Extracted from Voice
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('record')}
                      className="text-xs text-[#55941E] hover:text-[#447817] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Record Again
                    </button>
                  </div>
                  <p className="text-xs text-neutral-700 bg-white p-3 rounded-xl border border-neutral-200/60 leading-relaxed font-sans shadow-2xs">
                    &ldquo;{rawTranscript}&rdquo;
                  </p>

                  {/* Assumptions / Hints */}
                  {assumptions.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {assumptions.map((assump, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-medium"
                        >
                          <Info className="w-3 h-3 text-amber-600 shrink-0" />
                          {assump}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 1: Patient Information */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      1. Patient Details
                    </h3>
                    {isExistingPatient && (
                      <span className="text-[10px] font-semibold text-[#447817] bg-[#F0F9EB] border border-[#70BF2B]/30 px-2 py-0.5 rounded-full">
                        Existing Patient Matched
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Patient Full Name
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Samuel Mensah"
                        required
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+233XXXXXXXXX"
                        required
                        className="w-full h-9 px-3 text-xs font-mono bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Call Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value as 'english' | 'twi')}
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      >
                        <option value="english">English (Standard)</option>
                        <option value="twi">Asante Twi (Khaya)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Caregiver Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={caregiverPhone}
                        onChange={(e) => setCaregiverPhone(e.target.value)}
                        placeholder="+233XXXXXXXXX"
                        className="w-full h-9 px-3 text-xs font-mono bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Medication & Schedule */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-neutral-500" />
                      2. Medication & Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Drug Name & Strength
                      </label>
                      <input
                        type="text"
                        value={drugName}
                        onChange={(e) => setDrugName(e.target.value)}
                        placeholder="e.g. Paracetamol 500mg"
                        required
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Dosage Template
                      </label>
                      <select
                        value={dosageId}
                        onChange={(e) => setDosageId(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      >
                        {dosages.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label_english}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Frequency
                      </label>
                      <select
                        value={frequencyId}
                        onChange={(e) => setFrequencyId(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      >
                        {frequencies.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label_english}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Timing
                      </label>
                      <select
                        value={timingId}
                        onChange={(e) => setTimingId(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      >
                        {timings.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label_english}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        Reminder Times (24h)
                      </label>
                      <input
                        type="text"
                        value={scheduleTimes}
                        onChange={(e) => setScheduleTimes(e.target.value)}
                        placeholder="08:00, 14:00, 20:00"
                        required
                        className="w-full h-9 px-3 text-xs font-mono bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-[#70BF2B] focus:ring-2 focus:ring-[#70BF2B]/20 transition-all"
                      />
                    </div>

                    {/* Chronic Checkbox matching user screenshot */}
                    <div className="sm:col-span-2 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-800 select-none">
                        <input
                          type="checkbox"
                          checked={isChronic}
                          onChange={(e) => setIsChronic(e.target.checked)}
                          className="w-4 h-4 rounded text-[#70BF2B] focus:ring-[#70BF2B] border-neutral-300"
                        />
                        <span>Chronic / Long-term Medication</span>
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {step === 'success' && (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#F0F9EB] text-[#55941E] flex items-center justify-center mx-auto border border-[#70BF2B]/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-neutral-900">Prescription Saved Successfully</h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    Patient <strong>{patientName}</strong> has been enrolled with <strong>{drugName}</strong>. Automatic voice reminder calls are scheduled.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('record');
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('record');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#70BF2B] hover:bg-[#62A825] rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Dictate Another
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Action Footer for Review Step */}
          {step === 'review' && (
            <div className="shrink-0 border-t border-[#EBEAE5] bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('record')}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="voice-assistant-form"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#70BF2B] hover:bg-[#62A825] active:bg-[#55941E] rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
              </button>
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
};
