'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TableRowSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EscalationAlert } from '@/lib/types';
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function AlertsPage() {
  const { alerts, resolveAlert, isLoading, error, refetch } = useData();

  const [selectedTab, setSelectedTab] = useState<'open' | 'resolved' | 'cost' | 'side_effects' | 'forgetting'>('open');
  const [resolvingAlert, setResolvingAlert] = useState<EscalationAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedByName, setResolvedByName] = useState('Josh Nuku (Pharmacist)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const openCount = alerts.filter((a) => a.status === 'open').length;

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedTab === 'open') return alert.status === 'open';
    if (selectedTab === 'resolved') return alert.status === 'resolved';
    if (selectedTab === 'cost') return alert.status === 'open' && alert.escalation_type === 'pharmacist_cost';
    if (selectedTab === 'side_effects') return alert.status === 'open' && alert.escalation_type === 'health_worker_side_effect';
    if (selectedTab === 'forgetting') return alert.status === 'open' && alert.escalation_type === 'repeated_forgetting';
    return true;
  });

  const handleOpenResolveModal = (alert: EscalationAlert) => {
    setResolvingAlert(alert);
    setResolveError('');
    setResolutionNotes(
      alert.escalation_type === 'pharmacist_cost'
        ? 'Contacted patient regarding price barrier. Arranged generic alternative subsidy.'
        : alert.escalation_type === 'health_worker_side_effect'
        ? 'Advised patient to take dose with fuller meal; clinician alerted.'
        : 'Reviewed reminder schedule and enabled 10-minute pre-reminder call.'
    );
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;

    setIsSubmitting(true);
    setResolveError('');

    try {
      await resolveAlert(resolvingAlert.id, resolvedByName, resolutionNotes);
      setToastMessage(`Escalation for ${resolvingAlert.patient_name} resolved in database.`);
      setResolvingAlert(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setResolveError(err?.message || 'Failed to resolve alert in backend.');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Error Banner */}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Header */}
      <PageHeader
        title="Alerts &amp; Escalations"
        subtitle="Automated voice-call adherence escalations requiring clinician review"
        badge={
          openCount > 0 ? (
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              {openCount} Open
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#55941E] bg-[#F0F9EB] border border-[#70BF2B]/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Clear
            </span>
          )
        }
      />

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-[#ECECEC] text-xs shadow-xs">
        <button
          onClick={() => setSelectedTab('open')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
            selectedTab === 'open'
              ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          All Open ({openCount})
        </button>
        <button
          onClick={() => setSelectedTab('cost')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
            selectedTab === 'cost'
              ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Cost Barriers
        </button>
        <button
          onClick={() => setSelectedTab('side_effects')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
            selectedTab === 'side_effects'
              ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Side Effects
        </button>
        <button
          onClick={() => setSelectedTab('forgetting')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
            selectedTab === 'forgetting'
              ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-200/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Repeated Forgetting
        </button>
        <button
          onClick={() => setSelectedTab('resolved')}
          className={`px-3.5 py-2 rounded-xl font-medium transition-all ${
            selectedTab === 'resolved'
              ? 'bg-[#F0F9EB] text-[#55941E] font-semibold border border-[#70BF2B]/30 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Resolved ({alerts.filter((a) => a.status === 'resolved').length})
        </button>
      </div>

      {/* Alerts Table (Desktop) */}
      <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden hidden sm:block shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAF9F6]/50 text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Patient</th>
                <th className="py-3.5 px-4 font-semibold">Reason</th>
                <th className="py-3.5 px-4 font-semibold">Details & Context</th>
                <th className="py-3.5 px-4 font-semibold">Reported</th>
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
                </>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6">
                    <EmptyState
                      icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
                      title={
                        selectedTab === 'open'
                          ? 'All escalations resolved!'
                          : 'No alerts in this category'
                      }
                      description={
                        selectedTab === 'open'
                          ? 'There are currently no unresolved patient alerts requiring pharmacist intervention.'
                          : 'No matching alerts found for this filter tab.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const dateFormatted = alert.created_at
                    ? new Date(alert.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently';

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#F8F9FA] transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <Link href={`/patients/${alert.patient_id}`} className="block">
                          <span className="font-semibold text-gray-900 group-hover:text-[#55941E] transition-colors">
                            {alert.patient_name}
                          </span>
                          <span className="block text-xs text-gray-400 font-mono">
                            {alert.patient_phone}
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="alert" alertType={alert.escalation_type} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-700 max-w-md leading-relaxed">
                        {alert.details}
                        {alert.status === 'resolved' && alert.resolution_notes && (
                          <div className="mt-1 text-[11px] text-[#447817] bg-[#F0F9EB] p-1.5 rounded-lg border border-[#70BF2B]/30">
                            <strong>Note:</strong> {alert.resolution_notes} &middot; <em>{alert.resolved_by}</em>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="status" status={alert.status} size="sm" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        {alert.status === 'open' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white hover:bg-[#F0F9EB] hover:text-[#55941E] hover:border-[#70BF2B]/40 shadow-2xs"
                            onClick={() => handleOpenResolveModal(alert)}
                          >
                            Resolve alert
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Cards (Mobile) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6 text-[#70BF2B]" />}
            title="No alerts in this category"
            description="All clear! No open escalations found for this filter tab."
          />
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border border-[#ECECEC] rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant="alert" alertType={alert.escalation_type} size="sm" />
                <Badge variant="status" status={alert.status} size="sm" />
              </div>

              <div>
                <Link
                  href={`/patients/${alert.patient_id}`}
                  className="font-semibold text-base text-gray-900 block"
                >
                  {alert.patient_name}
                </Link>
                <span className="text-xs text-gray-400 font-mono">{alert.patient_phone}</span>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{alert.details}</p>
              </div>

              {alert.status === 'resolved' && alert.resolution_notes && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <strong>Resolution:</strong> {alert.resolution_notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="text-gray-400 font-mono">
                  {alert.created_at
                    ? new Date(alert.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Today'}
                </span>

                {alert.status === 'open' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenResolveModal(alert)}
                  >
                    Resolve alert
                  </Button>
                ) : (
                  <span className="text-emerald-700 font-medium">Completed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Alert Modal */}
      {resolvingAlert && (
        <Modal
          isOpen={true}
          onClose={() => setResolvingAlert(null)}
          title="Resolve patient escalation"
          description={`Record clinical action taken for ${resolvingAlert.patient_name}.`}
        >
          <form onSubmit={handleConfirmResolve} className="space-y-4 pt-1">
            {resolveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {resolveError}
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs space-y-1">
              <div className="font-semibold text-gray-800">
                Escalation: {resolvingAlert.human_label}
              </div>
              <p className="text-gray-600">{resolvingAlert.details}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Clinical intervention notes *
              </label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe counseling, dosage adjustment, subsidy, or caregiver follow-up..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Resolved by *
              </label>
              <input
                type="text"
                required
                value={resolvedByName}
                onChange={(e) => setResolvedByName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setResolvingAlert(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Resolving alert...' : 'Confirm resolution'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
