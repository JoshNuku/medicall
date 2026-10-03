'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  User,
  Clock,
  Save,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  BellRing,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [saved, setSaved] = useState(false);

  // Clinician Profile Form State
  const [name, setName] = useState('Josh Nuku');
  const [email, setEmail] = useState('nukujosh119@gmail.com');
  const [phone, setPhone] = useState('+233 53 628 7642');

  // Schedule & Adherence Preferences State
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [defaultLanguage, setDefaultLanguage] = useState<'twi' | 'english'>('twi');
  const [retryInterval, setRetryInterval] = useState('30');
  const [noAnswerWindow, setNoAnswerWindow] = useState('120');
  const [escalationThreshold, setEscalationThreshold] = useState('2');
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);

  // Sync initial profile from auth session
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
    }

    // Load saved schedule preferences
    try {
      const savedPrefs = localStorage.getItem('medicall_clinical_settings');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.morningTime) setMorningTime(parsed.morningTime);
        if (parsed.eveningTime) setEveningTime(parsed.eveningTime);
        if (parsed.defaultLanguage) setDefaultLanguage(parsed.defaultLanguage);
        if (parsed.retryInterval) setRetryInterval(parsed.retryInterval);
        if (parsed.noAnswerWindow) setNoAnswerWindow(parsed.noAnswerWindow);
        if (parsed.escalationThreshold) setEscalationThreshold(parsed.escalationThreshold);
        if (parsed.enableSoundAlerts !== undefined) setEnableSoundAlerts(parsed.enableSoundAlerts);
        if (parsed.phone) setPhone(parsed.phone);
      }
    } catch (_) {}
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update session user in AuthContext & localStorage
    updateUser({
      name: name.trim(),
      email: email.trim(),
    });

    // 2. Persist schedule preferences
    try {
      localStorage.setItem(
        'medicall_clinical_settings',
        JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          morningTime,
          eveningTime,
          defaultLanguage,
          retryInterval,
          noAnswerWindow,
          escalationThreshold,
          enableSoundAlerts,
        })
      );
    } catch (_) {}

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    setMorningTime('08:00');
    setEveningTime('20:00');
    setDefaultLanguage('twi');
    setRetryInterval('30');
    setNoAnswerWindow('120');
    setEscalationThreshold('2');
    setEnableSoundAlerts(true);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Toast Notification */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#70BF2B]" />
          <span>Profile and clinical preferences saved successfully.</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Manage your clinical profile, automated reminder windows, and adherence rules."
      />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Clinician Profile (Fully Editable) */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center border border-[#70BF2B]/20">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Clinician Profile</h2>
                <p className="text-xs text-gray-500">Edit your healthcare worker identity and credentials</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label htmlFor="clinician-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="clinician-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Kwame Mensah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="clinician-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  id="clinician-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@medicall.gh"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="clinician-phone" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pharmacist Direct Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  id="clinician-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 53 628 7642"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Emergency escalation contact for patient keypad 0.
              </p>
            </div>
          </div>
        </div>

        {/* Reminder Windows & Dialect Configuration (Fully Editable) */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Call Windows &amp; Adherence Schedules</h2>
              <p className="text-xs text-gray-500">Configure standard daily reminder hours and automated retry logic</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="morning-call-time" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Morning Medication Window
              </label>
              <input
                id="morning-call-time"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default start time for morning dose phone reminders.</p>
            </div>

            <div>
              <label htmlFor="evening-call-time" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Evening Medication Window
              </label>
              <input
                id="evening-call-time"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default start time for evening dose phone reminders.</p>
            </div>
          </div>

          {/* Retry Delays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="retry-interval" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Dose "Not Taken" Retry Delay
              </label>
              <select
                id="retry-interval"
                value={retryInterval}
                onChange={(e) => setRetryInterval(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes (Standard)</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Time to wait before calling back if patient presses 2 (Not Taken).</p>
            </div>

            <div>
              <label htmlFor="no-answer-window" className="block text-xs font-semibold text-gray-700 mb-1.5">
                "No Answer" Retry Window
              </label>
              <select
                id="no-answer-window"
                value={noAnswerWindow}
                onChange={(e) => setNoAnswerWindow(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
              >
                <option value="60">1 hour</option>
                <option value="120">2 hours (Standard)</option>
                <option value="180">3 hours</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Delay before retrying an unanswered or unreachable reminder.</p>
            </div>
          </div>

          {/* Dialect Selection */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Default Patient Voice Dialect
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setDefaultLanguage('twi')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'twi'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold ring-2 ring-[#70BF2B]/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Asante Twi</span>
                {defaultLanguage === 'twi' && <Check className="w-4 h-4 text-[#70BF2B]" />}
              </button>
              <button
                type="button"
                onClick={() => setDefaultLanguage('english')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'english'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold ring-2 ring-[#70BF2B]/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>English</span>
                {defaultLanguage === 'english' && <Check className="w-4 h-4 text-[#70BF2B]" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Applied automatically when enrolling new patients unless customized on their profile.
            </p>
          </div>

          {/* Clinical Escalation Sensitivity */}
          <div className="pt-2 border-t border-gray-100">
            <label htmlFor="escalation-threshold" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Automated Clinical Escalation Threshold
            </label>
            <select
              id="escalation-threshold"
              value={escalationThreshold}
              onChange={(e) => setEscalationThreshold(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/25 focus:border-[#70BF2B] transition-all"
            >
              <option value="1">Trigger alert after 1 missed dose</option>
              <option value="2">Trigger alert after 2 consecutive missed doses (Recommended)</option>
              <option value="3">Trigger alert after 3 missed doses</option>
            </select>
          </div>

          {/* Notification Alert Toggle */}
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Audio Chime on Critical Alerts</p>
                <p className="text-[10px] text-gray-400">Play a subtle clinical chime when a patient reports side effects or requests help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnableSoundAlerts(!enableSoundAlerts)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enableSoundAlerts ? 'bg-[#70BF2B]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  enableSoundAlerts ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleResetDefaults}
          >
            Reset Defaults
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
