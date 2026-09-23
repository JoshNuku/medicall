'use client';

import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from './AudioPlayer';
import { useData } from '@/lib/data-context';
import {
  ShieldCheck,
  Mic,
  Square,
  RotateCcw,
  Upload,
  Clock,
  Calendar,
  AlertCircle,
  Pill,
  Check,
} from 'lucide-react';

interface PrescribeMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (drugName: string) => void;
  patientId: number;
  patientName: string;
  patientLanguage?: 'twi' | 'english';
}

export const PrescribeMedicationModal: React.FC<PrescribeMedicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
  patientLanguage = 'twi',
}) => {
  const { templates, prescribeMedication } = useData();

  const [mode, setMode] = useState<'template' | 'recorded'>('template');
  const isPatientEnglish = (patientLanguage || '').toLowerCase() === 'english';
  const [language, setLanguage] = useState<'twi' | 'english'>(isPatientEnglish ? 'english' : 'twi');
  const hasInitializedLangRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !hasInitializedLangRef.current) {
      setLanguage(isPatientEnglish ? 'english' : (patientLanguage || 'twi'));
      hasInitializedLangRef.current = true;
    } else if (!isOpen) {
      hasInitializedLangRef.current = false;
    }
  }, [isOpen, patientLanguage, isPatientEnglish]);

  // Shared fields
  const [drugName, setDrugName] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState('08:00, 20:00');
  const [durationDays, setDurationDays] = useState(7);
  const [isChronic, setIsChronic] = useState(false);

  // Authentic Asante Twi template library fallbacks
  const defaultTemplates = [
    { id: 1, category: 'dosage', label_english: '1 tablet', text_twi: 'Fa baa baako' },
    { id: 2, category: 'dosage', label_english: '2 tablets', text_twi: 'Fa mmaa mmienu' },
    { id: 3, category: 'dosage', label_english: 'half tablet', text_twi: 'Fa fā' },
    { id: 4, category: 'dosage', label_english: '1 capsule', text_twi: 'Fa kotokuo baako' },
    { id: 5, category: 'dosage', label_english: '2 capsules', text_twi: 'Fa kotokuo mmienu' },
    { id: 6, category: 'dosage', label_english: '5ml (1 teaspoon)', text_twi: 'Nomi atere ketewa baako (5ml)' },
    { id: 7, category: 'dosage', label_english: '10ml (2 teaspoons)', text_twi: 'Nomi atere nketewa mmienu (10ml)' },
    { id: 8, category: 'dosage', label_english: '15ml (1 tablespoon)', text_twi: 'Nomi atere kɛseɛ baako (15ml)' },

    { id: 10, category: 'frequency', label_english: 'Once daily', text_twi: 'da biara pɛnkoro' },
    { id: 11, category: 'frequency', label_english: 'Twice daily', text_twi: 'da biara mprenu (anɔpa ne anwummerɛ)' },
    { id: 12, category: 'frequency', label_english: 'Three times daily', text_twi: 'da biara mprɛnsa (anɔpa, awia, ne anwummerɛ)' },
    { id: 13, category: 'frequency', label_english: 'Four times daily', text_twi: 'da biara mprɛnan' },
    { id: 14, category: 'frequency', label_english: 'Every other day', text_twi: 'da a ɛto so mmienu biara' },

    { id: 15, category: 'timing', label_english: 'Before meals', text_twi: 'ansa na woadidi' },
    { id: 16, category: 'timing', label_english: 'After meals', text_twi: 'sɛ wodidi wie a' },
    { id: 17, category: 'timing', label_english: 'With food', text_twi: 'bere a woregu so redidi' },
    { id: 18, category: 'timing', label_english: 'At bedtime', text_twi: 'ansa na wobɛkɔ akɔda' },
  ];

  // Map any outdated placeholders to authentic Twi
  const activeTemplates = React.useMemo(() => {
    if (!templates || templates.length === 0) return defaultTemplates;
    return templates.map((t) => {
      if (t.text_twi && t.text_twi.includes('[TWI:')) {
        const fallback = defaultTemplates.find((d) => d.label_english === t.label_english);
        if (fallback) return { ...t, text_twi: fallback.text_twi };
      }
      return t;
    });
  }, [templates]);

  // Template Mode fields
  const dosages = activeTemplates.filter((t) => t.category === 'dosage');
  const frequencies = activeTemplates.filter((t) => t.category === 'frequency');
  const timings = activeTemplates.filter((t) => t.category === 'timing');

  const [selectedDosageId, setSelectedDosageId] = useState<number>(dosages[0]?.id || 1);
  const [selectedFrequencyId, setSelectedFrequencyId] = useState<number>(frequencies[1]?.id || 10);
  const [selectedTimingId, setSelectedTimingId] = useState<number>(timings[1]?.id || 15);

  const selectedDosage = dosages.find((d) => d.id === selectedDosageId);
  const selectedFrequency = frequencies.find((f) => f.id === selectedFrequencyId);
  const selectedTiming = timings.find((t) => t.id === selectedTimingId);

  // Auto-assembled prompt with medication name (English or authentic Twi)
  const autoAssembledPrompt = React.useMemo(() => {
    if (!selectedDosage || !selectedFrequency || !selectedTiming) return '';
    const cleanDrug = drugName.trim();
    if (language === 'english') {
      const prefix = cleanDrug ? `Take your ${cleanDrug}: ` : 'Take ';
      return `${prefix}${selectedDosage.label_english}, ${selectedFrequency.label_english}, ${selectedTiming.label_english}.`;
    }
    const prefix = cleanDrug ? `Fa wo nnuro ${cleanDrug}: ` : '';
    return `${prefix}${selectedDosage.text_twi}, ${selectedFrequency.text_twi}, ${selectedTiming.text_twi}.`;
  }, [selectedDosage, selectedFrequency, selectedTiming, language, drugName]);

  const [instructionPrompt, setInstructionPrompt] = useState<string>('');
  const [isPromptManuallyEdited, setIsPromptManuallyEdited] = useState<boolean>(false);

  // Synchronize unless clinician manually edited it
  React.useEffect(() => {
    if (!isPromptManuallyEdited) {
      setInstructionPrompt(autoAssembledPrompt);
    }
  }, [autoAssembledPrompt, isPromptManuallyEdited]);

  // Recorded Mode states: 'ready' | 'recording' | 'recorded'
  const [recordingState, setRecordingState] = useState<'ready' | 'recording' | 'recorded'>('ready');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | File | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioFilterRef = useRef<BiquadFilterNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recordingState === 'recording' && recordingStartedAtRef.current) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current!) / 1000);
        setRecordingSeconds(elapsed);
      }, 250);
    }
    return () => clearInterval(timer);
  }, [recordingState]);

  React.useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (processedStreamRef.current) {
        processedStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [recordedAudioUrl]);

  const prepareCleanAudioStream = (inputStream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return inputStream;
    }

    const context = new AudioCtx();
    const source = context.createMediaStreamSource(inputStream);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();

    filter.type = 'lowpass';
    filter.frequency.value = 5500;
    filter.Q.value = 1;

    gain.gain.value = 1.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    audioContextRef.current = context;
    audioSourceRef.current = source;
    audioFilterRef.current = filter;
    audioGainRef.current = gain;
    processedStreamRef.current = destination.stream;

    return destination.stream;
  };

  const handleStartRecording = async () => {
    try {
      setRecordingError(null);
      setRecordingSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        },
      });

      const cleanedStream = prepareCleanAudioStream(stream);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(cleanedStream, mimeType
        ? {
          mimeType,
          bitsPerSecond: mimeType.includes('opus') ? 96000 : 128000,
        }
        : undefined);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        if (recordedAudioUrl) {
          URL.revokeObjectURL(recordedAudioUrl);
        }

        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        setRecordingState('recorded');

        stream.getTracks().forEach((track) => track.stop());
        if (processedStreamRef.current) {
          processedStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        mediaStreamRef.current = null;
        processedStreamRef.current = null;

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
      };

      recorder.start();
      setRecordingState('recording');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone access was blocked. Please allow mic access and try again.';
      setRecordingError(message);
      setRecordingState('ready');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleResetRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    audioChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setRecordingError(null);
    setRecordingState('ready');
    setRecordingSeconds(0);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
  };

  const handleDeleteRecording = () => {
    handleResetRecording();
    setRecordedAudioBlob(null);
  };

  const handleAudioFileSelected = (file: File | null) => {
    if (!file) return;

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    const url = URL.createObjectURL(file);
    setRecordedAudioBlob(file);
    setRecordedAudioUrl(url);
    setRecordingError(null);
    setRecordingState('recorded');
    setRecordingSeconds(Math.max(1, Math.ceil(file.size / 16000)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) {
      setError('Please provide a drug name.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const effectiveLanguage: 'twi' | 'english' = language;
    const cleanDrug = drugName.trim();
    const promptToSave = instructionPrompt.trim() || autoAssembledPrompt;

    try {
      if (mode === 'template') {
        await prescribeMedication(patientId, {
          drug_name: cleanDrug,
          instruction_source: 'template',
          dosage_template_id: selectedDosageId,
          frequency_template_id: selectedFrequencyId,
          timing_template_id: selectedTimingId,
          dosage_label: selectedDosage?.label_english,
          frequency_label: selectedFrequency?.label_english,
          timing_label: selectedTiming?.label_english,
          assembled_twi: promptToSave,
          schedule_times: scheduleTimes,
          duration_days: isChronic ? 90 : durationDays,
          is_chronic: isChronic,
          language: effectiveLanguage,
        });
      } else {
        if (!recordedAudioBlob) {
          setError('Please record or upload a voice note before saving the medication instructions.');
          setIsSubmitting(false);
          return;
        }

        const audioFile = recordedAudioBlob instanceof File
          ? recordedAudioBlob
          : new File([recordedAudioBlob], 'recording_voice_note.webm', {
            type: recordedAudioBlob.type || 'audio/webm',
          });

        await prescribeMedication(patientId, {
          drug_name: cleanDrug,
          instruction_source: 'recorded',
          dosage_template_id: null,
          frequency_template_id: null,
          timing_template_id: null,
          dosage_label: 'Custom oral dose',
          frequency_label: 'As instructed by pharmacist',
          timing_label: 'Recorded clinical instruction',
          assembled_twi: effectiveLanguage === 'english' ? 'Voice instruction recorded in English.' : 'Voice instruction recorded by pharmacist.',
          schedule_times: scheduleTimes,
          duration_days: isChronic ? 90 : durationDays,
          is_chronic: isChronic,
          audioFile,
          language: effectiveLanguage,
        });
      }

      const savedDrugName = drugName.trim();
      // Reset and close
      setDrugName('');
      handleResetRecording();
      setError('');
      onSuccess?.(savedDrugName);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to prescribe medication in backend.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prescribe medication"
      description={`Set up an adherence regimen with voice reminders for ${patientName}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {(error || recordingError) && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || recordingError}</span>
          </div>
        )}

        {/* Prescription Voice Language Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Voice Instruction Language *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setLanguage('twi');
                setIsPromptManuallyEdited(false);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                language === 'twi'
                  ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Twi (Akan)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('english');
                setIsPromptManuallyEdited(false);
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                language === 'english'
                  ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Strict Two-Mode Switcher */}
        <div className="bg-[#FAF9F6] p-1.5 rounded-2xl border border-gray-200/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${mode === 'template'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mode 1: Verified Template</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('recorded')}
            className={`py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${mode === 'recorded'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            <Mic className="w-4 h-4 text-purple-600" />
            <span>Mode 2: Pharmacist Recorded</span>
          </button>
        </div>

        {/* Drug Name (Shared) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Drug name &amp; strength *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Amoxicillin 500mg, Metformin 850mg"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all"
            />
            <Pill className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* MODE 1: VERIFIED TEMPLATE */}
        {mode === 'template' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Notice about verified templates */}


            {/* Template Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Dosage */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Dosage *
                </label>
                <select
                  value={selectedDosageId}
                  onChange={(e) => setSelectedDosageId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all cursor-pointer"
                >
                  {dosages.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label_english}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Frequency *
                </label>
                <select
                  value={selectedFrequencyId}
                  onChange={(e) => setSelectedFrequencyId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all cursor-pointer"
                >
                  {frequencies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label_english}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timing */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Timing *
                </label>
                <select
                  value={selectedTimingId}
                  onChange={(e) => setSelectedTimingId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all cursor-pointer"
                >
                  {timings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label_english}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assembled Voice Prompt */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700">
                  Voice Instructions ({language === 'english' ? 'English' : 'Asante Twi'})
                </label>
                {isPromptManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPromptManuallyEdited(false);
                      setInstructionPrompt(autoAssembledPrompt);
                    }}
                    className="text-xs font-medium text-[#55941E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <textarea
                value={instructionPrompt}
                onChange={(e) => {
                  setInstructionPrompt(e.target.value);
                  setIsPromptManuallyEdited(true);
                }}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#F8F9FA] text-sm text-gray-900 leading-relaxed focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all resize-none"
                placeholder={language === 'english' ? 'Assembled English instructions...' : 'Assembled Twi instructions...'}
              />

              <div className="pt-1.5 flex items-center justify-between text-xs text-gray-500">
                <span className="font-mono text-[11px] text-gray-400">
                  Keypad menu (1=Confirm &middot; 2=Side effects &middot; 3=Cost &middot; 4=Shift &middot; 0=Help)
                </span>
                <span className="text-[11px] text-gray-400">
                  Appended automatically
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: PHARMACIST RECORDED */}
        {mode === 'recorded' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl space-y-1">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-700 shrink-0" />
                <span className="text-xs font-semibold text-purple-950">
                  Custom Voice Instruction ({language === 'english' ? 'English' : 'Asante Twi'})
                </span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed pl-6">
                Record only the dosage and timing for <strong>{drugName.trim() || 'this medication'}</strong>. The automated patient keypad choices (Confirm, Side effects, Cost, Shift, Help) are automatically appended by the system.
              </p>
            </div>

            {/* Voice Recording Widget */}
            <div className="border border-gray-200 rounded-2xl p-5 bg-[#FAF9F6] text-center space-y-4">
              {recordingState === 'ready' && (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center border border-purple-200">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Record {language === 'english' ? 'English' : 'Twi'} Instruction
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Speak clearly into the microphone in {language === 'english' ? 'English' : 'Akan/Twi'}.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="bg-purple-700 hover:bg-purple-800 border-purple-700"
                      icon={<Mic className="w-4 h-4" />}
                      onClick={handleStartRecording}
                    >
                      Start recording
                    </Button>
                    <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer shadow-xs gap-2">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span>Upload audio</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(event) => handleAudioFileSelected(event.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-pulse-dot" />
                    <span className="text-sm font-bold text-rose-700 tracking-wider font-mono">
                      RECORDING &middot; 0:{recordingSeconds.toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Animated recording waveform */}
                  <div className="flex items-center justify-center gap-1.5 h-8">
                    {[35, 60, 90, 100, 75, 45, 80, 60, 40, 95, 70, 30].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-purple-600 rounded-full animate-wave-bar"
                        style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>

                  <div>
                    <Button
                      type="button"
                      variant="danger"
                      icon={<Square className="w-3.5 h-3.5 fill-current" />}
                      onClick={handleStopRecording}
                    >
                      Stop & Save recording
                    </Button>
                  </div>
                </div>
              )}

              {recordingState === 'recorded' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      Voice note ready
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteRecording}
                        className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetRecording}
                        className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-record</span>
                      </button>
                    </div>
                  </div>

                  <AudioPlayer
                    title={drugName || 'Custom Clinical Instruction'}
                    language={language}
                    durationSeconds={recordingSeconds > 0 ? recordingSeconds : 14}
                    audioUrl={recordedAudioUrl || undefined}
                    appendKeypressTrailer={true}
                  />

                  {/* Automated Keypress Menu Attachment Indicator */}
                  <div className="p-3 bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-gray-800">IVR Keypad Menu Automatically Attached</span>
                    </div>
                    <span className="font-mono text-[11px] text-gray-500">
                      {language === 'english'
                        ? 'Key 9: Repeat · Key 0: Pharmacist'
                        : 'Mia 9: Tie bio · Mia 0: Duruyɛfoɔ'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regimen Scheduling Details (Shared) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Call schedule times (HH:MM) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="08:00, 20:00"
                value={scheduleTimes}
                onChange={(e) => setScheduleTimes(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] transition-all"
              />
              <Clock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Comma-separated reminder times (e.g. 08:00, 20:00)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Duration (Days) *
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={365}
                disabled={isChronic}
                value={isChronic ? 90 : durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B] disabled:bg-gray-100 transition-all"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="chronic"
                checked={isChronic}
                onChange={(e) => setIsChronic(e.target.checked)}
                className="w-4 h-4 rounded text-[#70BF2B] focus:ring-[#70BF2B] cursor-pointer"
              />
              <label htmlFor="chronic" className="text-xs text-gray-700 font-medium cursor-pointer select-none">
                Chronic medication (Ongoing regimen)
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Prescribing medication...' : 'Prescribe medication'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
