const cron = require('node-cron');
const { getAllActiveMedications, hasReminderCallToday, getCallsNeedingRetry } = require('../db/queries/schedulerQueries');
const { createCallEvent } = require('../db/queries/callEvents');
const { processRetries } = require('./retryService');
const { makeOutboundCall, sendSms } = require('./africasTalkingService');
const { preGenerateReminderAudio, cleanupOldAudioFiles } = require('./reminderPipelineService');

const getHhMmWithOffset = (now = new Date(), offsetMinutes = 0) => {
  const target = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(target.getHours())}:${pad(target.getMinutes())}`;
};

const runSchedulerCycle = async (now = new Date()) => {
  const currentHhMm = getHhMmWithOffset(now, 0);
  const upcoming10MinHhMm = getHhMmWithOffset(now, 10);
  const todayDate = now.toISOString().split('T')[0];
  const medications = getAllActiveMedications();

  // 1. Pre-generate AI reminder audio 10 mins before call to avoid telephony latency
  if (process.env.ENABLE_AI_AGENT === 'true') {
    for (const med of medications) {
      if (med.instruction_source === 'recorded') continue;
      const times = (med.schedule_times || '').split(',').map(t => t.trim());
      if (times.includes(upcoming10MinHhMm)) {
        preGenerateReminderAudio({
          patientId: med.patient_id,
          medicationId: med.id
        }).catch(err => console.error(`[Pre-Gen Error Med ${med.id}]:`, err.message));
      }
    }
  }

  // 2. Trigger calls at the exact scheduled time
  for (const med of medications) {
    const times = (med.schedule_times || '').split(',').map(t => t.trim());
    if (!times.includes(currentHhMm)) continue;

    if (hasReminderCallToday(med.id, todayDate, currentHhMm)) continue;

    // Immediately create call_event to prevent duplicates
    const callEvent = createCallEvent({
      patient_id: med.patient_id,
      medication_id: med.id,
      scheduled_time: now.toISOString(),
      call_type: 'reminder',
      attempt_number: 1,
      dose_date: todayDate
    });

    // Trigger outbound voice call
    await makeOutboundCall(med.phone_number);

    // Optional companion SMS (configurable flag)
    if (process.env.ENABLE_REMINDER_SMS === 'true') {
      const smsMsg = `MediCall reminder: Please take your ${med.drug_name} now.`;
      await sendSms(med.phone_number, smsMsg);
    }
  }

  // 3. Handle retries
  const callsNeedingRetry = getCallsNeedingRetry();
  if (callsNeedingRetry.length > 0) {
    processRetries(callsNeedingRetry);
  }
};

const startScheduler = () => {
  // Run scheduler cycle every minute
  cron.schedule('* * * * *', () => {
    runSchedulerCycle().catch(err => console.error('[Scheduler Error]:', err.message));
  });

  // Run temp audio file cleanup every 6 hours
  cron.schedule('0 */6 * * *', () => {
    cleanupOldAudioFiles(24);
  });

  console.log('MediCall cron scheduler started (interval: 1 minute).');
};

module.exports = {
  startScheduler,
  runSchedulerCycle
};
