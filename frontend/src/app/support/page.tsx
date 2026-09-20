'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Phone,
  Mail,
  BookOpen,
  HelpCircle,
  ChevronDown,
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
