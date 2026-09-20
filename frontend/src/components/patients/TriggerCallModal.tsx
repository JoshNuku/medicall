'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Phone, PhoneCall, CheckCircle2, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { triggerCallApi } from '@/lib/api';

interface TriggerCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: number;
}

export const TriggerCallModal: React.FC<TriggerCallModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
}) => {
  const { patients } = useData();
  const [selectedPatientId, setSelectedPatientId] = useState<number | string>(
    defaultPatientId || (patients.length > 0 ? patients[0].id : '')
  );
  const [customPhone, setCustomPhone] = useState('+233546007121');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const selectedPatient = patients.find((p) => p.id === Number(selectedPatientId));

  const handleStartCall = async () => {
    setIsCalling(true);
    setCallStatus('idle');
    setStatusMessage('');

    try {
      const phoneToCall = selectedPatient ? selectedPatient.phone_number : customPhone;
      const res = await triggerCallApi({
        patient_id: selectedPatient ? selectedPatient.id : undefined,
        phone_number: phoneToCall,
      });

      if (res.status === 'success') {
        setCallStatus('success');
        setStatusMessage(
          `Outbound call queued successfully! Handset will ring shortly. Answer and test pressing 1 (Confirm), 2 (Side effects), 3 (Cost), 4 (Forgot), or 0 (Help).`
        );
      } else {
        throw new Error(res.message || 'Call failed to dispatch');
      }
    } catch (err: any) {
      setCallStatus('error');
      setStatusMessage(err?.message || 'Failed to dispatch outbound call.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Patient Voice Demo"
      description="Trigger an immediate automated medication check-in call via Africa's Talking"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status Preview Card */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#70BF2B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <span>Interactive Adherence Call</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-[#70BF2B]/15 text-[#55941E] px-2 py-0.5 rounded-full">
                Live Telco
              </span>
            </h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Dials the patient’s physical phone using verified local instructions (Twi or English) and captures keypress outcomes in real time.
            </p>
          </div>
        </div>

        {/* Patient Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Target Patient
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              const p = patients.find((pat) => pat.id === Number(e.target.value));
              if (p) setCustomPhone(p.phone_number);
            }}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/40 focus:border-[#70BF2B] transition-all"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.phone_number} ({p.preferred_language.toUpperCase()})
              </option>
            ))}
            <option value="custom">Custom Phone Number...</option>
          </select>
        </div>

        {/* Custom Phone Number input if custom selected */}
        {selectedPatientId === 'custom' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Recipient Phone Number (E.164)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+233546007121"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/40 focus:border-[#70BF2B]"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>
        )}

        {/* Keypad Menu Guide */}
        <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl p-3.5 text-xs text-gray-600">
          <p className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#70BF2B]" />
            What the patient will hear & keypad actions:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                1
              </span>
              <span>Confirm dose taken</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-xs">
                2
              </span>
              <span>Side effects / Not taken</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                9
              </span>
              <span>Replay instructions</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-xs">
                0
              </span>
              <span>Request pharmacist help</span>
            </div>
          </div>
        </div>

        {/* Result notification */}
        {callStatus === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {callStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isCalling}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleStartCall}
            disabled={isCalling}
            icon={<Phone className={`w-4 h-4 ${isCalling ? 'animate-bounce' : ''}`} />}
            className="bg-[#70BF2B] hover:bg-[#62A825] text-white font-semibold"
          >
            {isCalling ? 'Dialing Phone...' : 'Start Live Call'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
