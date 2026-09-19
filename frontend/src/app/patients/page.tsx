'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnrollPatientModal } from '@/components/patients/EnrollPatientModal';
import { TableRowSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  UserPlus,
  Search,
  ChevronRight,
  Phone,
  HeartHandshake,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PatientsPage() {
  const { patients, enrollPatient, isLoading, error, refetch } = useData();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'twi' | 'english'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'attention'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone_number.includes(searchQuery);

      const matchesLanguage =
        languageFilter === 'all' || patient.preferred_language === languageFilter;

      const matchesStatus =
        statusFilter === 'all' || patient.status === statusFilter;

      return matchesSearch && matchesLanguage && matchesStatus;
    });
  }, [patients, searchQuery, languageFilter, statusFilter]);

  const handleEnroll = async (data: {
    name: string;
    phone_number: string;
    preferred_language: 'twi' | 'english';
    caregiver_phone?: string;
  }) => {
    const newPatient = await enrollPatient(data);
    setToastMessage(`Patient ${newPatient.name} enrolled into real database successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error / Offline Banner */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Header */}
      <PageHeader
        title="Patients"
        subtitle="Manage enrolled patients and their medication adherence."
        actions={
          <Button
            variant="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsEnrollModalOpen(true)}
          >
            Enroll patient
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EBEAE5] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-gray-200/70 text-xs">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                languageFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Languages
            </button>
            <button
              onClick={() => setLanguageFilter('twi')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                languageFilter === 'twi'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Twi
            </button>
            <button
              onClick={() => setLanguageFilter('english')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                languageFilter === 'english'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              English
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-gray-200/70 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('attention')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'attention'
                  ? 'bg-white text-amber-800 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Attention
            </button>
          </div>
        </div>
      </div>

      {/* Patient Table (Desktop) */}
      <div className="bg-white border border-[#EBEAE5] rounded-2xl overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAF9F6]/50 text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Patient</th>
                <th className="py-3.5 px-4 font-semibold">Phone</th>
                <th className="py-3.5 px-4 font-semibold">Language</th>
                <th className="py-3.5 px-4 font-semibold">Caregiver</th>
                <th className="py-3.5 px-4 font-semibold">Enrolled</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <EmptyState
                      icon={<Users className="w-6 h-6 text-emerald-600" />}
                      title="No patients enrolled yet"
                      description="Enroll your first patient to begin automated Twi/English medication reminder voice calls."
                      actionText="+ Enroll first patient"
                      onAction={() => setIsEnrollModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <EmptyState
                      icon={<Search className="w-6 h-6 text-gray-400" />}
                      title="No patients match filters"
                      description="Try adjusting your search query or language/status filters."
                      actionText="Reset filters"
                      onAction={() => {
                        setSearchQuery('');
                        setLanguageFilter('all');
                        setStatusFilter('all');
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const enrolledDate = patient.enrolled_at
                    ? new Date(patient.enrolled_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recently';

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-[#FAF9F6] transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <Link href={`/patients/${patient.id}`} className="block">
                          <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {patient.name}
                          </span>
                          <span className="block text-xs text-gray-500 font-normal">
                            Adherence: <strong className="font-semibold text-gray-900">{patient.adherence_rate}%</strong>
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-600">
                        {patient.phone_number}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="language" language={patient.preferred_language} />
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {patient.caregiver_phone ? (
                          <span className="font-mono">{patient.caregiver_phone}</span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500">
                        {enrolledDate}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="status" status={patient.status} size="sm" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 transition-colors"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredPatients.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filteredPatients.length} of {patients.length} enrolled patients</span>
            <span>Real SQLite Database Persistence Active</span>
          </div>
        )}
      </div>

      {/* Patient Cards (Mobile) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={<Search className="w-6 h-6 text-gray-400" />}
            title="No patients found"
            description="Try changing your search terms or filter selection."
          />
        ) : (
          filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="block bg-white border border-[#EBEAE5] rounded-2xl p-4 shadow-xs hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-base text-gray-900">{patient.name}</span>
                <Badge variant="status" status={patient.status} size="sm" />
              </div>

              <div className="space-y-1 text-xs text-gray-600 mb-3 font-mono">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{patient.phone_number}</span>
                </div>
                {patient.caregiver_phone && (
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-3.5 h-3.5 text-gray-400" />
                    <span>Caregiver: {patient.caregiver_phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <Badge variant="language" language={patient.preferred_language} />
                <div className="text-gray-600">
                  Adherence: <strong className="text-gray-900 font-semibold">{patient.adherence_rate}%</strong>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Enroll Patient Modal */}
      <EnrollPatientModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onEnroll={handleEnroll}
      />
    </div>
  );
}
