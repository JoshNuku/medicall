'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CallEvent, CallOutcome } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { TriggerCallModal } from '@/components/patients/TriggerCallModal';
import {
  Phone,
  Search,
  ExternalLink,
  Clock,
  Filter,
  CheckCircle2,
  PhoneOff,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface CallActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  calls: CallEvent[];
}

type FilterOutcome = 'all' | 'confirmed' | 'no_answer' | 'not_taken' | 'pending';
type RangeFilter = 'today' | '7d' | '30d' | 'all';

const diagnosticLabels: Record<string, { label: string; shell: string }> = {
  felt_better: { label: 'Felt better & stopped', shell: 'bg-amber-50 text-amber-800 border-amber-200' },
  side_effects: { label: 'Side effects reported', shell: 'bg-rose-50 text-rose-700 border-rose-200' },
  cost: { label: 'Refill / Cost barrier', shell: 'bg-orange-50 text-orange-800 border-orange-200' },
  forgot: { label: 'Forgot dose', shell: 'bg-blue-50 text-blue-700 border-blue-200' },
  other: { label: 'Other barrier', shell: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export const CallActivityModal: React.FC<CallActivityModalProps> = ({
  isOpen,
  onClose,
  calls,
}) => {
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<FilterOutcome>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('today');
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [isDialModalOpen, setIsDialModalOpen] = useState(false);

  // Filter calls based on range, outcome, and search term
  const filteredCalls = useMemo(() => {
    const now = new Date();

    return calls.filter((call) => {
      // 1. Date range filter
      if (rangeFilter === 'today') {
        const callDate = new Date(call.scheduled_time || call.dose_date);
        if (callDate.toDateString() !== now.toDateString()) return false;
      } else if (rangeFilter === '7d') {
        const callDate = new Date(call.scheduled_time || call.dose_date);
        const diff = (now.getTime() - callDate.getTime()) / 86400000;
        if (diff < 0 || diff > 7) return false;
      } else if (rangeFilter === '30d') {
        const callDate = new Date(call.scheduled_time || call.dose_date);
        const diff = (now.getTime() - callDate.getTime()) / 86400000;
        if (diff < 0 || diff > 30) return false;
      }

      // 2. Outcome filter
      if (outcomeFilter === 'confirmed' && call.outcome !== 'confirmed') return false;
      if (outcomeFilter === 'no_answer' && call.outcome !== 'no_answer') return false;
      if (outcomeFilter === 'not_taken' && call.outcome !== 'not_taken') return false;
      if (outcomeFilter === 'pending' && (call.outcome !== 'pending' && call.outcome !== null && call.outcome !== undefined)) return false;

      // 3. Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const patientMatch = (call.patient_name || '').toLowerCase().includes(query);
        const phoneMatch = (call.patient_phone || '').toLowerCase().includes(query);
        const drugMatch = (call.drug_name || '').toLowerCase().includes(query);
        const typeMatch = (call.call_type || '').toLowerCase().includes(query);
        if (!patientMatch && !phoneMatch && !drugMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [calls, rangeFilter, outcomeFilter, search]);

  // Outcome counts within current range
  const outcomeCounts = useMemo(() => {
    const now = new Date();
    const inRange = calls.filter((c) => {
      if (rangeFilter === 'today') {
        const callDate = new Date(c.scheduled_time || c.dose_date);
        return callDate.toDateString() === now.toDateString();
      }
      if (rangeFilter === '7d') {
        const callDate = new Date(c.scheduled_time || c.dose_date);
        const diff = (now.getTime() - callDate.getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      }
      if (rangeFilter === '30d') {
        const callDate = new Date(c.scheduled_time || c.dose_date);
        const diff = (now.getTime() - callDate.getTime()) / 86400000;
        return diff >= 0 && diff <= 30;
      }
      return true;
    });

    return {
      all: inRange.length,
      confirmed: inRange.filter((c) => c.outcome === 'confirmed').length,
      no_answer: inRange.filter((c) => c.outcome === 'no_answer').length,
      not_taken: inRange.filter((c) => c.outcome === 'not_taken').length,
      pending: inRange.filter((c) => c.outcome === 'pending' || !c.outcome).length,
    };
  }, [calls, rangeFilter]);

  const handleDial = (patientId: number) => {
    setSelectedPatientId(patientId);
    setIsDialModalOpen(true);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Complete Call Activity & Live Queue"
        description="Comprehensive audit timeline of all outbound reminder calls, patient responses, and scheduled retries."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {/* Top Controls: Search & Range Selector */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, phone, drug..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20 focus:border-[#70BF2B]"
              />
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-[#F5F4F0] p-1 rounded-xl text-xs font-medium text-gray-600 shrink-0 self-start sm:self-auto border border-gray-200/80">
              {(['today', '7d', '30d', 'all'] as RangeFilter[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRangeFilter(r)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    rangeFilter === r
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All History'}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setOutcomeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                outcomeFilter === 'all'
                  ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Calls ({outcomeCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setOutcomeFilter('confirmed')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                outcomeFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/60 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmed ({outcomeCounts.confirmed})</span>
            </button>
            <button
              type="button"
              onClick={() => setOutcomeFilter('no_answer')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                outcomeFilter === 'no_answer'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-rose-50/60 text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>No Answer ({outcomeCounts.no_answer})</span>
            </button>
            <button
              type="button"
              onClick={() => setOutcomeFilter('not_taken')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                outcomeFilter === 'not_taken'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                  : 'bg-orange-50/60 text-orange-700 border-orange-200 hover:bg-orange-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Barrier / Not Taken ({outcomeCounts.not_taken})</span>
            </button>
            <button
              type="button"
              onClick={() => setOutcomeFilter('pending')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                outcomeFilter === 'pending'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-blue-50/60 text-blue-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending / Retries ({outcomeCounts.pending})</span>
            </button>
          </div>

          {/* Call Timeline List */}
          <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xs max-h-[55vh] overflow-y-auto divide-y divide-gray-100">
            {filteredCalls.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#F8F9FA] text-gray-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="font-semibold text-gray-800">No matching call events found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Try adjusting the filter pills or search terms above.
                </p>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const dateObj = new Date(call.scheduled_time || call.dose_date);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                const timeStr = dateObj.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                const dateStr = dateObj.toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                });

                const diagInfo = call.diagnostic_reason ? diagnosticLabels[call.diagnostic_reason] : null;

                return (
                  <div
                    key={call.id}
                    className="p-3.5 sm:p-4 hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Time & Patient Identity */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-left shrink-0 w-16">
                        <span className="text-xs font-mono font-bold text-gray-900 block">{timeStr}</span>
                        <span className="text-[10px] text-gray-400 block">{isToday ? 'Today' : dateStr}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/patients/${call.patient_id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-[#55941E] transition-colors truncate"
                          >
                            {call.patient_name || 'Patient'}
                          </Link>
                          {call.patient_phone && (
                            <span className="text-xs font-mono text-gray-400 truncate">
                              {call.patient_phone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="font-medium text-gray-700">{call.drug_name || 'Medication'}</span>
                          <span>&middot;</span>
                          <span className="capitalize text-gray-500">
                            {call.call_type === 'retry' ? `Retry (Attempt #${call.attempt_number || 2})` : `${call.call_type || 'Reminder'}`}
                          </span>
                          {diagInfo && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${diagInfo.shell}`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{diagInfo.label}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Outcome Badge & Direct Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <Badge variant="outcome" outcome={call.outcome} size="sm" />

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDial(call.patient_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#70BF2B]/30 hover:bg-[#F0F9EB] text-[#55941E] text-xs font-medium transition-all shadow-2xs"
                          title="Trigger instant voice call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Redial</span>
                        </button>

                        <Link
                          href={`/patients/${call.patient_id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="View patient profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer Summary */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>
              Showing {filteredCalls.length} of {calls.length} total call events
            </span>
            <span className="inline-flex items-center gap-1 text-[#55941E] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-time telephony sync</span>
            </span>
          </div>
        </div>
      </Modal>

      {/* Embedded Trigger Call Modal */}
      <TriggerCallModal
        isOpen={isDialModalOpen}
        onClose={() => setIsDialModalOpen(false)}
        defaultPatientId={selectedPatientId}
      />
    </>
  );
};
