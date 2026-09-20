'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Language } from '@/lib/types';
import { UserPlus, Phone, Globe, HeartHandshake } from 'lucide-react';

import { useData } from '@/lib/data-context';

interface EnrollPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll?: (data: {
    name: string;
    phone_number: string;
    preferred_language: Language;
    caregiver_phone?: string;
  }) => Promise<void> | void;
}

export const EnrollPatientModal: React.FC<EnrollPatientModalProps> = ({
  isOpen,
  onClose,
  onEnroll,
}) => {
  const { enrollPatient } = useData();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+233 ');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('twi');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Patient name is required.');
      return;
    }
    if (phoneNumber.trim().length < 9) {
      setError('A valid phone number is required for voice calls.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        preferred_language: preferredLanguage,
        caregiver_phone: caregiverPhone.trim() || undefined,
      };

      if (onEnroll) {
        await onEnroll(payload);
      } else {
        await enrollPatient(payload);
      }

      // Reset and close
      setName('');
      setPhoneNumber('+233 ');
      setPreferredLanguage('twi');
      setCaregiverPhone('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to enroll patient in backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll new patient"
      description="Register a patient into the automated voice adherence system."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
            {error}
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Phone number (Voice calls) *
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              placeholder="+233 24 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition-all"
            />
            <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Automated reminder voice calls and SMS alerts will be placed to this line.
          </p>
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
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Caregiver phone (Optional)
          </label>
          <div className="relative">
            <input
              type="tel"
              placeholder="+233 50 123 4567"
              value={caregiverPhone}
              onChange={(e) => setCaregiverPhone(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition-all"
            />
            <HeartHandshake className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Receives SMS notifications if the patient misses repeated reminder calls.
          </p>
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
            icon={<UserPlus className="w-4 h-4" />}
          >
            {isSubmitting ? 'Enrolling patient...' : 'Enroll patient'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
