const { getMedicationById } = require('../db/queries/medications');
const { 
  getPatientById, 
  updateCaregiverNotifiedAt, 
  incrementPatientFailures, 
  resetPatientFailures, 
  updatePatientStatus 
} = require('../db/queries/patients');
const { getRecentCallEventsForMedication } = require('../db/queries/callEvents');
const { createEscalation } = require('../db/queries/escalations');
const { getDiagnosticResponsesByPatientId } = require('../db/queries/diagnosticResponses');
const { sendSms } = require('./africasTalkingService');
const { ESCALATION_TYPES } = require('../config/constants');

const MISSED_OUTCOMES = ['not_taken', 'no_answer', 'answered_no_keypress'];

const checkCaregiverAlert = async (patient, recentCalls) => {
  if (!patient || !patient.caregiver_phone || patient.caregiver_notified_at) return;
  const lastTwo = (recentCalls || []).slice(0, 2);
  const consecutiveNoAnswer = lastTwo.length >= 2 && lastTwo.every(c => c.outcome === 'no_answer');

  if (consecutiveNoAnswer) {
    const msg = `${patient.name} may have missed their medication reminder. Please check in with them.`;
    await sendSms(patient.caregiver_phone, msg);
    await updateCaregiverNotifiedAt(patient.id);
  }
};

/**
 * Circuit Breaker Engine:
 * Tracks consecutive failures (wrong number, phone permanently off, no signal).
 * At 2 failures: Dispatches SMS with Helpline number.
 * At 5 failures: Auto-pauses calling to conserve airtime and flags for pharmacist re-verification.
 */
const handleCallOutcomeCircuitBreaker = async (patientId, outcome) => {
  if (outcome === 'confirmed') {
    await resetPatientFailures(patientId);
    return;
  }

  if (outcome === 'no_answer' || outcome === 'answered_no_keypress') {
    const failures = await incrementPatientFailures(patientId);
    const patient = await getPatientById(patientId);
    const helpline = process.env.AT_VOICE_PHONE_NUMBER || '+233308048104';

    // Tier 1: Battery / Signal Fallback SMS at 2 misses
    if (failures === 2 && patient?.phone_number) {
      const smsText = `Hello ${patient.name}, MediCall tried calling you for your medication. If your phone was off, please dial our helpline (${helpline}) anytime to listen to your instructions.`;
      console.log(`📱 [SMS Fallback]: Dispatching helpline SMS to ${patient.name} after 2 missed calls...`);
      await sendSms(patient.phone_number, smsText).catch(e => console.warn('SMS fallback error:', e.message));
    }

    // Tier 2: Circuit Breaker Trip at 5 misses
    if (failures >= 5 && patient?.status !== 'paused_invalid_phone') {
      await updatePatientStatus(patientId, 'paused_invalid_phone');
      await createEscalation({
        patient_id: patientId,
        escalation_type: ESCALATION_TYPES.GENERAL_ATTENTION
      });
      console.warn(`⚡ [Circuit Breaker Tripped]: Patient #${patientId} (${patient?.name}) paused after ${failures} consecutive call failures.`);
    }
  }
};

/**
 * Refill Gap Anomaly Detector:
 * Checks for "too good to be true" adherence when refill date has passed.
 */
const checkRefillGapAnomaly = async (patientId, medicationId) => {
  const medication = await getMedicationById(medicationId);
  if (!medication || medication.is_chronic) return; // Chronic meds have open refill cycles

  const createdAt = new Date(medication.created_at).getTime();
  const daysActive = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);

  // If medication duration is over by more than 7 days
  if (daysActive > (medication.duration_days + 7)) {
    const recent = await getRecentCallEventsForMedication(medicationId, 15);
    const confirmedCount = (recent || []).filter(c => c.outcome === 'confirmed').length;
    const rate = recent.length > 0 ? (confirmedCount / recent.length) : 0;

    if (rate >= 0.85) {
      console.log(`⚠️ [Refill Gap Anomaly]: Patient #${patientId} has ${Math.round(rate * 100)}% adherence but ${medication.drug_name} duration ended ${Math.round(daysActive - medication.duration_days)} days ago.`);
      await createEscalation({
        patient_id: patientId,
        escalation_type: ESCALATION_TYPES.PHARMACIST_COST
      });
    }
  }
};

const handleDiagnosticReason = async (patientId, diagnosticResponseId, reason, medicationId) => {
  if (reason === 'cost') {
    return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.PHARMACIST_COST });
  }
  if (reason === 'side_effects') {
    return await createEscalation({ patient_id: patientId, diagnostic_response_id: diagnosticResponseId, escalation_type: ESCALATION_TYPES.HEALTH_WORKER_SIDE_EFFECT });
  }
  if (reason === 'felt_better') {
    const medication = medicationId ? await getMedicationById(medicationId) : null;
    const drugName = (medication?.drug_name || '').toLowerCase();
    const isAntibiotic = /amox|cipro|azithro|ampic|doxy|ceft|metronid|flagyl|augmentin|penicillin|bactrim/i.test(drugName);
    const isChronic = Boolean(medication?.is_chronic || /amlo|lisin|losar|nifed|metformin|gliben|atenol|enalap|hydrochloro/i.test(drugName));

    const clinicalNote = isAntibiotic
      ? `Patient stopped taking ${medication?.drug_name || 'antibiotic'} early because they feel better. Urgent adherence counseling needed to prevent antimicrobial resistance (AMR) and bacterial relapse.`
      : isChronic
      ? `Patient discontinued chronic maintenance medication (${medication?.drug_name || 'prescription'}) because symptoms resolved. Counseling required on asymptomatic hypertension/chronic disease control.`
      : `Patient paused medication early due to symptom improvement. Adherence counseling recommended.`;

    console.log(`🩺 [Clinical Adherence Guard]: "felt_better" reported for patient #${patientId} (${medication?.drug_name || 'Rx'}). ${clinicalNote}`);

    return await createEscalation({
      patient_id: patientId,
      diagnostic_response_id: diagnosticResponseId,
      escalation_type: ESCALATION_TYPES.GENERAL_ATTENTION
    });
  }
  if (reason === 'forgot') {
    const history = await getDiagnosticResponsesByPatientId(patientId);
    const consecutiveForgot = (history || []).slice(0, 3).filter(r => r.reason === 'forgot').length;
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
  await checkRefillGapAnomaly(patientId, medicationId);

  // Same-day check: count misses today
  const today = new Date().toISOString().split('T')[0];
  const sameDayMisses = (recentCalls || []).filter(c => c.dose_date === today && MISSED_OUTCOMES.includes(c.outcome)).length;
  if (sameDayMisses >= 2) return { action: 'trigger_diagnostic', reason: 'same_day_multiple_misses' };

  if (!medication || !medication.is_chronic) return { action: 'none' };

  // Cross-day check: distinct dose dates with misses
  const missedDates = [...new Set((recentCalls || []).filter(c => MISSED_OUTCOMES.includes(c.outcome)).map(c => c.dose_date))];
  if (missedDates.length >= 2) return { action: 'trigger_diagnostic', reason: 'chronic_consecutive_misses' };

  return { action: 'none' };
};

module.exports = {
  decideNextAction,
  handleCallOutcomeCircuitBreaker,
  checkRefillGapAnomaly
};
