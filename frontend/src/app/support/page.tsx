'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Phone,
  Mail,
  BookOpen,
  HelpCircle,
  ChevronDown,
  PhoneOutgoing,
  PhoneIncoming,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'How do automated outbound calls work?',
    answer:
      'MediCall connects through Africa’s Talking telephony in Accra. At scheduled reminder times, the system calls the patient’s phone (+233 30 804 8104), plays the Asante Twi or English instruction, and captures touch-tone keypad responses (1 for confirmed, 2 for not taken).',
  },
  {
    question: 'What happens when a patient reports not taking medication?',
    answer:
      'When a patient presses 2, the call branches into a diagnostic question (side effects, cost, forgot). An adverse reaction or side effect immediately triggers an escalation alert on the clinician dashboard.',
  },
  {
    question: 'Can pharmacists record custom voice instructions?',
    answer:
      'Yes. In the prescription drawer, clinicians can switch to "Pharmacist Recorded" mode and record direct voice instructions in any local Ghanaian dialect.',
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <PageHeader
        title="Support"
        subtitle="Clinical helpline and platform assistance."
      />

      {/* 3 Simple Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0F9EB] text-[#55941E] flex items-center justify-center border border-[#70BF2B]/20">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-gray-900">Emergency Escalations</h3>
            <p className="text-[11px] text-gray-500">24/7 helpline for adverse drug reactions</p>
          </div>
          <div className="pt-3 border-t border-gray-100 mt-3">
            <a
              href="tel:+233308048104"
              className="font-mono text-xs font-semibold text-[#55941E] hover:underline"
            >
              +233 30 804 8104
            </a>
          </div>
        </div>

        <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-gray-900">Clinical Desk Email</h3>
            <p className="text-[11px] text-gray-500">Inquiries on templates and regimens</p>
          </div>
          <div className="pt-3 border-t border-gray-100 mt-3">
            <a
              href="mailto:support@medicall.gh"
              className="font-mono text-xs font-semibold text-blue-600 hover:underline"
            >
              support@medicall.gh
            </a>
          </div>
        </div>

        <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-gray-900">Clinical Guide</h3>
            <p className="text-[11px] text-gray-500">Adherence protocols for Ghana</p>
          </div>
          <div className="pt-3 border-t border-gray-100 mt-3">
            <span className="text-xs font-medium text-purple-700">
              MediCall Protocols v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Telephony Keypress Reference Card */}
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#70BF2B] animate-pulse" />
              <h2 className="text-base font-semibold text-gray-900">
                Telephony Keypress Reference (DTMF Mappings)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Touch-tone keypad options spoken to patients during automated voice calls and helpline interactions.
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 w-fit">
            Africa&apos;s Talking Standard
          </span>
        </div>

        {/* Section 1: Outbound Reminders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 uppercase tracking-wider">
            <PhoneOutgoing className="w-3.5 h-3.5 text-[#55941E]" />
            <span>Outbound Automated Reminder Calls (Scheduled Regimens)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Key 1 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-300 shadow-2xs">
                1
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Dose Confirmed Taken</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Baako
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Confirms today&apos;s medication dose. Updates 7-day adherence rate, halts retry cycle, and resets caregiver SMS timer.
                </p>
                <div className="text-[10px] text-emerald-700 font-medium">
                  ✓ Plays positive confirmation audio
                </div>
              </div>
            </div>

            {/* Key 2 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-orange-300 shadow-2xs">
                2
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Dose Not Taken</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Mmienu
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Marks non-adherence and routes into diagnostic triage (side effects, cost, forgot, felt better).
                </p>
                <div className="text-[10px] text-orange-700 font-medium">
                  ⚠ Dispatches automated retry in 30 minutes
                </div>
              </div>
            </div>

            {/* Key 3 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
                3
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Cost Barrier / Refill Needed</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Mmiɛnsa
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Flags cost or supply barrier so the clinician can switch to NHIS-covered or affordable generic alternatives.
                </p>
                <div className="text-[10px] text-amber-700 font-medium">
                  📋 Generates pharmacist cost escalation
                </div>
              </div>
            </div>

            {/* Key 4 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-rose-300 shadow-2xs">
                4
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Adverse Reaction / Side Effects</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Nnan
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Patient reports adverse effects. Immediately triggers a high-priority clinical intervention alert on dashboard.
                </p>
                <div className="text-[10px] text-rose-700 font-medium">
                  🚨 High priority clinical escalation
                </div>
              </div>
            </div>

            {/* Key 6 / 9 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-blue-300 shadow-2xs">
                9
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Repeat Instruction</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Nkron / Nsia (6)
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Replays the complete medication dosage, frequency, and food/timing instructions from the beginning.
                </p>
                <div className="text-[10px] text-blue-700 font-medium">
                  🔄 Immediate audio replay
                </div>
              </div>
            </div>

            {/* Key 0 */}
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3.5 flex items-start gap-3 hover:border-gray-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-purple-300 shadow-2xs">
                0
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Speak With Pharmacist</h4>
                  <span className="text-[10px] font-mono bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    Twi: Hwee
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Patient requests human clinician support. Sends an automated SMS alert to the pharmacist&apos;s mobile phone for callback.
                </p>
                <div className="text-[10px] text-purple-700 font-medium">
                  📲 Instant SMS alert to +233 53 628 7642
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Inbound Helpline */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 uppercase tracking-wider">
              <PhoneIncoming className="w-3.5 h-3.5 text-[#55941E]" />
              <span>Inbound Helpline Dial-In (+233 30 804 8104)</span>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              Patients calling in anytime
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">1..N</span>
                <span className="text-xs font-semibold text-gray-800">Select Drug</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Chooses which medication audio to listen to when a patient has multiple active prescriptions.
              </p>
            </div>

            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">9</span>
                <span className="text-xs font-semibold text-gray-800">Replay Audio</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Replays the full prescription instruction or pharmacist voice note.
              </p>
            </div>

            <div className="bg-[#FAF9F6] border border-[#E8E6E0] rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">0</span>
                <span className="text-xs font-semibold text-gray-800">Clinical Desk</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Instantly dispatches SMS notification to the on-duty pharmacist to phone the patient back.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clean FAQ Card */}
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <HelpCircle className="w-4 h-4 text-[#70BF2B]" />
          <h2 className="text-sm font-semibold text-gray-900">Frequently Asked Questions</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-3 text-xs font-semibold text-gray-800 hover:text-[#55941E] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-[#70BF2B]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed bg-[#F8F9FA] p-3 rounded-xl border border-gray-100">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
