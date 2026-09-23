const { getMedicationById } = require('../db/queries/medications');
const { getPatientById, updateCaregiverNotifiedAt } = require('../db/queries/patients');
const { getRecentCallEventsForMedication } = require('../db/queries/callEvents');
const { createEscalation } = require('../db/queries/escalations');
const { getDiagnosticResponsesByPatientId } = require('../db/queries/diagnosticResponses');
const { sendSms } = require('./africasTalkingService');
const { ESCALATION_TYPES } = require('../config/constants');

const MISSED_OUTCOMES = ['not_taken', 'no_answer', 'answered_no_keypress'];

const checkCaregiverAlert = async (patient, recentCalls) => {
  if (!patient || !patient.caregiver_phone || patient.caregiver_notified_at) return;
  const lastTwo = recentCalls.slice(0, 2);
  const consecutiveNoAnswer = lastTwo.length >= 2 && lastTwo.every(c => c.outcome === 'no_answer');

  if (consecutiveNoAnswer) {
    const msg = `${patient.name} may have missed their medication reminder. Please check in with them.`;
    await sendSms(patient.caregiver_phone, msg);
    await updateCaregiverNotifiedAt(patient.id);
  }
};

const handleDiagnosticReason = async (patientId, diagnosticResponseId, reason, medicationId) => {
  if (reason === 'cost') {
    return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.PHARMACIST_COST });
  }
  if (reason === 'side_effects') {
    return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.HEALTH_WORKER_SIDE_EFFECT });
  }
  if (reason === 'forgot') {
    const history = await getDiagnosticResponsesByPatientId(patientId);
    const consecutiveForgot = history.slice(0, 3).filter(r => r.reason === 'forgot').length;
    if (consecutiveForgot >= 3) {
      return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.REPEATED_FORGETTING });
    }
    return { action: 'close_case' };
  }
  return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.GENERAL_ATTENTION });
};

const decideNextAction = async (patientId, medicationId, diagnosticContext = null) => {
  if (diagnosticContext) {
    return await handleDiagnosticReason(patientId, diagnosticContext.responseId, diagnosticContext.reason, medicationId);
  }

  const patient = await getPatientById(patientId);
  const medication = await getMedicationById(medicationId);
  const recentCalls = await getRecentCallEventsForMedication(medicationId, 10);

  await checkCaregiverAlert(patient, recentCalls);

  // Same-day check: count misses today
  const today = new Date().toISOString().split('T')[0];
  const sameDayMisses = recentCalls.filter(c => c.dose_date === today && MISSED_OUTCOMES.includes(c.outcome)).length;
  if (sameDayMisses >= 2) return { action: 'trigger_diagnostic', reason: 'same_day_multiple_misses' };

  if (!medication || !medication.is_chronic) return { action: 'none' };

  // Cross-day check: distinct dose dates with misses
  const missedDates = [...new Set(recentCalls.filter(c => MISSED_OUTCOMES.includes(c.outcome)).map(c => c.dose_date))];
  if (missedDates.length >= 2) return { action: 'trigger_diagnostic', reason: 'chronic_consecutive_misses' };

  return { action: 'none' };
};

module.exports = { decideNextAction };
