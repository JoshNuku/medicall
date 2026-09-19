'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AudioPlayer } from './AudioPlayer';
import { useData } from '@/lib/data-context';
import { Medication } from '@/lib/types';
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
}

export const PrescribeMedicationModal: React.FC<PrescribeMedicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
}) => {
  const { templates, prescribeMedication } = useData();

  const [mode, setMode] = useState<'template' | 'recorded'>('template');

  // Shared fields
  const [drugName, setDrugName] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState('08:00, 20:00');
  const [durationDays, setDurationDays] = useState(7);
  const [isChronic, setIsChronic] = useState(false);

  // Template Mode fields
  const dosages = templates.filter((t) => t.category === 'dosage');
  const frequencies = templates.filter((t) => t.category === 'frequency');
  const timings = templates.filter((t) => t.category === 'timing');

  const [selectedDosageId, setSelectedDosageId] = useState<number>(dosages[0]?.id || 1);
  const [selectedFrequencyId, setSelectedFrequencyId] = useState<number>(frequencies[1]?.id || 10);
  const [selectedTimingId, setSelectedTimingId] = useState<number>(timings[1]?.id || 15);

  // Recorded Mode states: 'ready' | 'recording' | 'recorded'
  const [recordingState, setRecordingState] = useState<'ready' | 'recording' | 'recorded'>('ready');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const selectedDosage = dosages.find((d) => d.id === selectedDosageId);
  const selectedFrequency = frequencies.find((f) => f.id === selectedFrequencyId);
  const selectedTiming = timings.find((t) => t.id === selectedTimingId);

  // Live recording simulation
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recordingState === 'recording') {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recordingState]);

  const handleStartRecording = () => {
    setRecordingSeconds(0);
    setRecordingState('recording');
  };

  const handleStopRecording = () => {
    setRecordingState('recorded');
    setRecordedAudioUrl('/audio/simulated_recording.mp3');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleResetRecording = () => {
    setRecordingState('ready');
    setRecordingSeconds(0);
    setRecordedAudioUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) {
      setError('Please provide a drug name.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'template') {
        await prescribeMedication(patientId, {
          drug_name: drugName.trim(),
          instruction_source: 'template',
          dosage_template_id: selectedDosageId,
          frequency_template_id: selectedFrequencyId,
          timing_template_id: selectedTimingId,
          dosage_label: selectedDosage?.label_english,
          frequency_label: selectedFrequency?.label_english,
          timing_label: selectedTiming?.label_english,
          assembled_twi: `${selectedDosage?.text_twi}, ${selectedFrequency?.text_twi}, ${selectedTiming?.text_twi}.`,
          schedule_times: scheduleTimes,
          duration_days: isChronic ? 90 : durationDays,
          is_chronic: isChronic,
        });
      } else {
        await prescribeMedication(patientId, {
          drug_name: drugName.trim(),
          instruction_source: 'recorded',
          dosage_template_id: null,
          frequency_template_id: null,
          timing_template_id: null,
          dosage_label: 'Custom oral dose',
          frequency_label: 'As instructed by pharmacist',
          timing_label: 'Recorded clinical instruction',
          assembled_twi: 'Voice instruction recorded by Kwame Mensah (Pharmacist).',
          schedule_times: scheduleTimes,
          duration_days: isChronic ? 90 : durationDays,
          is_chronic: isChronic,
        });
      }

      const savedDrugName = drugName.trim();
      // Reset and close
      setDrugName('');
      handleResetRecording();
      setError('');
      onSuccess?.(savedDrugName);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to prescribe medication in backend.');
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
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Strict Two-Mode Switcher */}
        <div className="bg-[#FAF9F6] p-1.5 rounded-2xl border border-gray-200/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              mode === 'template'
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
            className={`py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              mode === 'recorded'
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
            Drug name & strength *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Amoxicillin 500mg, Metformin 850mg"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <Pill className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* MODE 1: VERIFIED TEMPLATE */}
        {mode === 'template' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Notice about verified templates */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-900 leading-relaxed">
                <strong>Clinically verified phrases:</strong> Instructions are assembled from human-curated, medically validated Twi audio recordings. <em>No machine translation is ever used.</em>
              </p>
            </div>

            {/* Template Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Dosage */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Dosage *
                </label>
                <select
                  value={selectedDosageId}
                  onChange={(e) => setSelectedDosageId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Frequency *
                </label>
                <select
                  value={selectedFrequencyId}
                  onChange={(e) => setSelectedFrequencyId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Timing *
                </label>
                <select
                  value={selectedTimingId}
                  onChange={(e) => setSelectedTimingId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {timings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label_english}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assembled Preview */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Assembled Patient Call Prompt (Twi)
              </span>
              <p className="text-xs font-medium text-gray-800">
                {selectedDosage?.label_english} &middot; {selectedFrequency?.label_english} &middot; {selectedTiming?.label_english}
              </p>
              <p className="text-xs text-emerald-800 font-mono italic">
                &ldquo;{selectedDosage?.text_twi}, {selectedFrequency?.text_twi}, {selectedTiming?.text_twi}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* MODE 2: PHARMACIST RECORDED */}
        {mode === 'recorded' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 leading-relaxed">
                <strong>Direct Voice Recording:</strong> Record or upload custom instructions spoken in Twi directly by the pharmacist.
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
                    <h4 className="text-sm font-semibold text-gray-900">Record Twi Instruction</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Speak clearly into the microphone in Akan/Twi.
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
                        onChange={() => {
                          setRecordingState('recorded');
                          setRecordedAudioUrl('/audio/simulated_recording.mp3');
                        }}
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
                    <button
                      type="button"
                      onClick={handleResetRecording}
                      className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-record</span>
                    </button>
                  </div>

                  <AudioPlayer
                    title={drugName || 'Custom Instruction'}
                    language="twi"
                    durationSeconds={recordingSeconds > 0 ? recordingSeconds : 14}
                  />
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
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Comma-separated 24-hour reminder call times.
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
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-gray-100"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="chronic"
                checked={isChronic}
                onChange={(e) => setIsChronic(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="chronic" className="text-xs text-gray-700 font-medium cursor-pointer">
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
