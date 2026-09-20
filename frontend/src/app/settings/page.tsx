'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  PhoneCall,
  CheckCircle2,
  Clock,
  Globe2,
  User,
  Save,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<'twi' | 'english'>('twi');
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('20:00');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Notification */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#70BF2B]" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Configure telephony gateway and reminder schedules."
        actions={
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Clinician Profile */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center border border-[#70BF2B]/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Clinician Profile</h2>
              <p className="text-xs text-gray-500">Active pharmacist session</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[11px] mb-0.5">Name</span>
              <span className="font-semibold text-gray-900">Josh Nuku</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[11px] mb-0.5">Role</span>
              <span className="font-semibold text-[#55941E]">Lead Pharmacist Admin</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[11px] mb-0.5">Email</span>
              <span className="font-medium text-gray-700">nukujosh119@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Voice Gateway Card */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center border border-[#70BF2B]/20">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Telephony Voice Gateway</h2>
                <p className="text-xs text-gray-500">Africa's Talking Ghana</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#447817] font-medium bg-[#F0F9EB] px-2.5 py-1 rounded-full border border-[#70BF2B]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#70BF2B]" />
              Live Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[11px] mb-0.5">Virtual Caller ID</span>
              <span className="font-mono font-semibold text-gray-900">+233 30 804 8104</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[11px] mb-0.5">Account ID</span>
              <span className="font-mono font-medium text-gray-800">medicall012</span>
            </div>
          </div>
        </div>

        {/* Reminder Times & Dialect */}
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Call Windows &amp; Language</h2>
              <p className="text-xs text-gray-500">Automated schedule defaults</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Morning Call Time
              </label>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Evening Call Time
              </label>
              <input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/30 focus:border-[#70BF2B]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Default Patient Dialect
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setDefaultLanguage('twi')}
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'twi'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Asante Twi</span>
                {defaultLanguage === 'twi' && <Check className="w-3.5 h-3.5 text-[#70BF2B]" />}
              </button>
              <button
                type="button"
                onClick={() => setDefaultLanguage('english')}
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                  defaultLanguage === 'english'
                    ? 'bg-[#F0F9EB] border-[#70BF2B] text-[#447817] font-semibold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>English</span>
                {defaultLanguage === 'english' && <Check className="w-3.5 h-3.5 text-[#70BF2B]" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
