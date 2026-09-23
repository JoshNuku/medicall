'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnrollPatientModal } from '@/components/patients/EnrollPatientModal';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import { Modal } from '@/components/ui/Modal';
import { Patient } from '@/lib/types';
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
  Pencil,
  Trash2,
} from 'lucide-react';

export default function PatientsPage() {
  const router = useRouter();
  const { patients, enrollPatient, deletePatient, isLoading, error, refetch } = useData();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    router.push(`/patients/${newPatient.id}?enrolled=true`);
    return newPatient;
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
        subtitle="Voice-call medication adherence monitoring &amp; patient directory"
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
      <div className="bg-white border border-[#ECECEC] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70BF2B]/20 focus:border-[#70BF2B] transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-gray-200/70 text-xs">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                languageFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Languages
            </button>
            <button
              onClick={() => setLanguageFilter('twi')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                languageFilter === 'twi'
                  ? 'bg-[#70BF2B] text-white shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Twi
            </button>
            <button
              onClick={() => setLanguageFilter('english')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                languageFilter === 'english'
                  ? 'bg-[#70BF2B] text-white shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              English
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-gray-200/70 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'active'
                  ? 'bg-[#70BF2B] text-white shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('attention')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'attention'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Attention
            </button>
          </div>
        </div>
      </div>

      {/* Patient Table (Desktop) */}
      <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden hidden sm:block shadow-xs">
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
                      className="hover:bg-[#F8F9FA] transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <Link href={`/patients/${patient.id}`} className="block">
                          <span className="font-semibold text-gray-900 group-hover:text-[#55941E] transition-colors">
                            {patient.name}
                          </span>
                          <span className="block text-xs text-gray-500 font-normal">
                            Adherence: <strong className="font-semibold text-gray-900">{patient.adherence_rate !== null && patient.adherence_rate !== undefined ? `${patient.adherence_rate}%` : 'New'}</strong>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="inline-flex items-center text-xs font-semibold text-[#55941E] hover:text-[#447817] bg-[#F0F9EB] px-2.5 py-1.5 rounded-lg border border-[#70BF2B]/30 transition-colors"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPatientToEdit(patient);
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#55941E] hover:bg-[#F0F9EB] rounded-lg transition-colors cursor-pointer"
                            title="Edit patient profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPatientToDelete(patient);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete patient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            title="No patients match filters"
            description="Try adjusting your search query or language/status filters."
            actionText="Reset filters"
            onAction={() => {
              setSearchQuery('');
              setLanguageFilter('all');
              setStatusFilter('all');
            }}
          />
        ) : (
          filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="block bg-white border border-[#ECECEC] rounded-2xl p-4 shadow-xs hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Link href={`/patients/${patient.id}`}>
                  <span className="font-semibold text-base text-gray-900 hover:text-[#55941E] transition-colors">{patient.name}</span>
                </Link>
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
                <div className="flex items-center gap-2">
                  <Badge variant="language" language={patient.preferred_language} />
                  <span className="text-gray-600">
                    Adherence: <strong className="text-gray-900 font-semibold">{patient.adherence_rate !== null && patient.adherence_rate !== undefined ? `${patient.adherence_rate}%` : 'New'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="p-1.5 text-gray-400 hover:text-[#55941E] hover:bg-[#F0F9EB] rounded-lg transition-colors"
                    title="Manage patient"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPatientToEdit(patient)}
                    className="p-1.5 text-gray-400 hover:text-[#55941E] hover:bg-[#F0F9EB] rounded-lg transition-colors cursor-pointer"
                    title="Edit patient"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientToDelete(patient)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete patient"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enroll Patient Modal */}
      <EnrollPatientModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onEnroll={handleEnroll}
      />

      {/* Edit Patient Modal */}
      <EditPatientModal
        isOpen={!!patientToEdit}
        onClose={() => setPatientToEdit(null)}
        patient={patientToEdit}
        onSuccess={(updated) => {
          setToastMessage(`Patient profile for "${updated.name}" updated successfully.`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title={`Delete patient "${patientToDelete?.name}"?`}
        description="This action cannot be undone. All active prescriptions, voice schedules, and call timeline logs will be permanently deleted."
      >
        <div className="pt-2 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
            <Trash2 className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Permanent Deletion Warning</p>
              <p className="mt-0.5 text-rose-700">
                Removing <strong>{patientToDelete?.name}</strong> ({patientToDelete?.phone_number}) will halt all scheduled daily automated reminder calls immediately.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPatientToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                if (!patientToDelete) return;
                setIsDeleting(true);
                try {
                  const name = patientToDelete.name;
                  await deletePatient(patientToDelete.id);
                  setPatientToDelete(null);
                  setToastMessage(`Patient "${name}" and all associated records deleted.`);
                  setTimeout(() => setToastMessage(null), 4000);
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Failed to delete patient';
                  alert(msg);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? 'Deleting patient...' : 'Delete patient'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
