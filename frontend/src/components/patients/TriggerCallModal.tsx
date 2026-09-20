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
      title="Trigger Outbound Call"
      description="Automated medication reminder call with live DTMF keypress capture."
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Minimalist Gateway Status */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8F9FA] border border-[#EAEAEA] rounded-xl text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-[#70BF2B] shrink-0" />
            <span className="font-semibold text-gray-900">Voice Adherence Call</span>
            <span className="text-gray-300">&middot;</span>
            <span className="text-gray-500">Twi &amp; English IVR</span>
          </div>
          <span className="text-[11px] font-semibold text-[#55941E] bg-[#F0F9EB] px-2 py-0.5 rounded-md border border-[#70BF2B]/30">
            Live Gateway
          </span>
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
        <div className="bg-[#F8F9FA] border border-[#ECECEC] rounded-xl p-3.5 text-xs text-gray-600">
          <p className="font-semibold text-gray-800 mb-2.5 flex items-center gap-1.5 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Interactive IVR Keypad Responses</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-gray-200/70 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[11px] font-mono shrink-0">
                1
              </span>
              <span className="text-gray-700">Confirm dose taken</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200/70 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-[11px] font-mono shrink-0">
                2
              </span>
              <span className="text-gray-700">Side effects / Missed</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200/70 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[11px] font-mono shrink-0">
                9
              </span>
              <span className="text-gray-700">Replay instruction</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-gray-200/70 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-[11px] font-mono shrink-0">
                0
              </span>
              <span className="text-gray-700">Pharmacist assistance</span>
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
