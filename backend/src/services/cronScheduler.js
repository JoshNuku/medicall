const cron = require('node-cron');
const { getAllActiveMedications, hasReminderCallToday, getCallsNeedingRetry } = require('../db/queries/schedulerQueries');
const { createCallEvent } = require('../db/queries/callEvents');
const { processRetries } = require('./retryService');
const { makeOutboundCall, sendSms } = require('./africasTalkingService');
const { preGenerateReminderAudio, cleanupOldAudioFiles } = require('./reminderPipelineService');
const db = require('../db/connection');

const getHhMmWithOffset = (now = new Date(), offsetMinutes = 0) => {
  const target = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(target.getHours())}:${pad(target.getMinutes())}`;
};

const runSchedulerCycle = async (now = new Date()) => {
  const currentHhMm = getHhMmWithOffset(now, 0);
  const upcoming10MinHhMm = getHhMmWithOffset(now, 10);
  const todayDate = now.toISOString().split('T')[0];
  const medications = await getAllActiveMedications();

  // 1. Pre-generate AI reminder audio 10 mins before call to avoid telephony latency
  if (process.env.ENABLE_AI_AGENT === 'true') {
    for (const med of medications) {
      if (med.instruction_source === 'recorded') continue;
      const times = (med.schedule_times || '').split(',').map(t => t.trim());
      if (times.includes(upcoming10MinHhMm)) {
        try {
          console.log(`🤖 [CRON PRE-GEN 10M]: Pre-generating reminder audio for Patient #${med.patient_id} (Med #${med.id})...`);
          const audioResult = await preGenerateReminderAudio({
            patientId: med.patient_id,
            medicationId: med.id,
            speakerId: 'female'
          });
          if (audioResult && typeof audioResult === 'string' && (audioResult.startsWith('/audio/') || audioResult.startsWith('http://') || audioResult.startsWith('https://'))) {
            await db.query('UPDATE medications SET reminder_audio_url = $1 WHERE id = $2', [audioResult, med.id]);
            med.reminder_audio_url = audioResult;
          }
        } catch (err) {
          console.error(`[Pre-Gen Error Med ${med.id}]:`, err.message);
        }
      }
    }
  }

  // 2. Trigger calls at the exact scheduled time
  for (const med of medications) {
    const times = (med.schedule_times || '').split(',').map(t => t.trim());
    if (!times.includes(currentHhMm)) continue;

    if (await hasReminderCallToday(med.id, todayDate, currentHhMm)) continue;

    // Ensure reminder audio / agent message is generated if not already done 10 mins prior
    if (process.env.ENABLE_AI_AGENT === 'true' && med.instruction_source !== 'recorded') {
      const isEnglish = (med.language || '').toLowerCase() === 'english';
      const needsGen = isEnglish || !med.reminder_audio_url;
      if (needsGen) {
        try {
          console.log(`🤖 [CRON CALL-TIME AGENT]: Generating reminder audio for Patient #${med.patient_id} (Med #${med.id})...`);
          const audioResult = await preGenerateReminderAudio({
            patientId: med.patient_id,
            medicationId: med.id,
            speakerId: 'female'
          });
          if (audioResult && typeof audioResult === 'string' && (audioResult.startsWith('/audio/') || audioResult.startsWith('http://') || audioResult.startsWith('https://'))) {
            await db.query('UPDATE medications SET reminder_audio_url = $1 WHERE id = $2', [audioResult, med.id]);
            med.reminder_audio_url = audioResult;
          }
        } catch (genErr) {
          console.warn(`⚠️ [Call Time Audio Notice Med ${med.id}]:`, genErr.message);
        }
      }
    }

    // Immediately create call_event to prevent duplicates
    await createCallEvent({
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
  const callsNeedingRetry = await getCallsNeedingRetry();
  if (callsNeedingRetry.length > 0) {
    await processRetries(callsNeedingRetry);
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
