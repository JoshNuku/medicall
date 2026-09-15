const cron = require('node-cron');
const { getAllActiveMedications, hasReminderCallToday, getCallsNeedingRetry } = require('../db/queries/schedulerQueries');
const { createCallEvent } = require('../db/queries/callEvents');
const { processRetries } = require('./retryService');
const { makeOutboundCall, sendSms } = require('./africasTalkingService');

const getCurrentHhMm = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const runSchedulerCycle = async (now = new Date()) => {
  const currentHhMm = getCurrentHhMm(now);
  const todayDate = now.toISOString().split('T')[0];
  const medications = getAllActiveMedications();

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

  // Handle retries
  const callsNeedingRetry = getCallsNeedingRetry();
  if (callsNeedingRetry.length > 0) {
    processRetries(callsNeedingRetry);
  }
};

const startScheduler = () => {
  cron.schedule('* * * * *', () => {
    runSchedulerCycle().catch(err => console.error('[Scheduler Error]:', err.message));
  });
  console.log('MediCall cron scheduler started (interval: 1 minute).');
};

module.exports = {
  startScheduler,
  runSchedulerCycle
};
