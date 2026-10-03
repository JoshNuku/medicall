'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Language, Patient } from '@/lib/types';
import { Phone, HeartHandshake, Check, AlertCircle } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { validatePhoneNumber, formatPhoneDisplay } from '@/lib/phone';
import { formatApiError } from '@/lib/api';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess?: (updated: Patient) => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) => {
  const { updatePatient } = useData();

  const [name, setName] = useState(patient?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(patient?.phone_number || '');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>((patient?.preferred_language as Language) || 'twi');
  const [caregiverPhone, setCaregiverPhone] = useState(patient?.caregiver_phone || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live validation calculations
  const phoneValidation = validatePhoneNumber(phoneNumber, true);
  const isCaregiverFilled = Boolean(caregiverPhone.trim());
  const caregiverValidation = validatePhoneNumber(caregiverPhone, false);

  const prevPatientIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && patient && prevPatientIdRef.current !== patient.id) {
      setName(patient.name || '');
      setPhoneNumber(patient.phone_number || '');
      setPreferredLanguage((patient.preferred_language as Language) || 'twi');
      setCaregiverPhone(patient.caregiver_phone || '');
      setError('');
      prevPatientIdRef.current = patient.id;
    } else if (!isOpen) {
      prevPatientIdRef.current = null;
    }
  }, [isOpen, patient?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    if (!name.trim()) {
      setError('Patient name is required.');
      return;
    }

    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'A valid Ghanaian phone number is required.');
      return;
    }

    if (isCaregiverFilled && !caregiverValidation.isValid) {
      setError(`Caregiver phone: ${caregiverValidation.error || 'Invalid phone number format.'}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updated = await updatePatient(patient.id, {
        name: name.trim(),
        phone_number: phoneValidation.normalized!,
        preferred_language: preferredLanguage,
        caregiver_phone: caregiverValidation.normalized || null,
      });

      onSuccess?.(updated);
      onClose();
    } catch (err: unknown) {
      setError(formatApiError(err, 'Failed to update patient profile. Server may be offline.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit patient profile"
      description={`Update adherence details and contact information for ${patient.name}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Full name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Kwame Mensah"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20 focus:border-[#70BF2B] transition-all"
          />
        </div>

        {/* Phone Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Phone number (Voice calls) *
            </label>
            {phoneValidation.isValid && phoneValidation.network && (
              <span className="text-[11px] font-medium text-[#447817] bg-[#F0F9EB] px-2 py-0.5 rounded-full border border-[#70BF2B]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#70BF2B]" />
                {phoneValidation.network} ({phoneValidation.formatted})
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              placeholder="+233 24 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 font-mono transition-all ${
                phoneNumber.trim() && !phoneValidation.isValid
                  ? 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'
                  : 'border-gray-200 focus:ring-[#70BF2B]/20 focus:border-[#70BF2B]'
              }`}
            />
            <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-gray-400">
              Automated reminder voice calls and SMS alerts will be placed to this line.
            </p>
            {phoneNumber.trim() && !phoneValidation.isValid && (
              <span className="text-[11px] text-amber-600 font-medium">
                {phoneValidation.error?.split('.')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Preferred Language */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Preferred language *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPreferredLanguage('twi')}
              className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                preferredLanguage === 'twi'
                  ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Twi (Akan)</span>
            </button>
            <button
              type="button"
              onClick={() => setPreferredLanguage('english')}
              className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                preferredLanguage === 'english'
                  ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Caregiver Phone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Caregiver phone (Optional)
            </label>
            {isCaregiverFilled && caregiverValidation.isValid && caregiverValidation.network && (
              <span className="text-[11px] font-medium text-[#447817] bg-[#F0F9EB] px-2 py-0.5 rounded-full border border-[#70BF2B]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#70BF2B]" />
                {caregiverValidation.network} ({caregiverValidation.formatted})
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              placeholder="+233 50 123 4567"
              value={caregiverPhone}
              onChange={(e) => setCaregiverPhone(e.target.value)}
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 font-mono transition-all ${
                isCaregiverFilled && !caregiverValidation.isValid
                  ? 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'
                  : 'border-gray-200 focus:ring-[#70BF2B]/20 focus:border-[#70BF2B]'
              }`}
            />
            <HeartHandshake className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-gray-400">
              Receives SMS alerts if the patient misses repeated scheduled reminder calls.
            </p>
            {isCaregiverFilled && !caregiverValidation.isValid && (
              <span className="text-[11px] text-amber-600 font-medium">
                {caregiverValidation.error?.split('.')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            icon={<Check className="w-4 h-4" />}
            className="bg-[#70BF2B] hover:bg-[#62A825] text-white"
          >
            {isSubmitting ? 'Saving changes...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
