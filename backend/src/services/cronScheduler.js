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
  const medications = await getAllActiveMedications();

  // 1. Pre-generate AI reminder audio 10 mins before call (opt-in via ENABLE_CRON_AI_PREGEN=true to protect API credits)
  const isAiEnabled = process.env.ENABLE_AI_AGENT === 'true';
  const isPreGenEnabled = process.env.ENABLE_CRON_AI_PREGEN === 'true';

  if (isAiEnabled && isPreGenEnabled) {
    for (const med of medications) {
      if (med.instruction_source === 'recorded') continue;
      // Skip if reminder audio is already pre-generated and cached
      if (med.reminder_audio_url && (med.reminder_audio_url.startsWith('http') || med.reminder_audio_url.startsWith('/audio/'))) {
        continue;
      }

      const times = (med.schedule_times || '').split(',').map(t => t.trim());
      if (times.includes(upcoming10MinHhMm)) {
        try {
          console.log(`🤖 [CRON PRE-GEN 10M]: Pre-generating reminder audio for Patient #${med.patient_id} (Med #${med.id})...`);
          const audioResult = await preGenerateReminderAudio({
            patientId: med.patient_id,
            medicationId: med.id,
            speakerId: 'female'
          });
          if (audioResult && typeof audioResult === 'string' && (audioResult.startsWith('/audio/') || audioResult.startsWith('http'))) {
            const db = require('../db/connection');
            await db.prepare('UPDATE medications SET reminder_audio_url = ? WHERE id = ?').run(audioResult, med.id);
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

    try {
      if (await hasReminderCallToday(med.id, todayDate, currentHhMm)) continue;

      console.log(`\n⏰ [CRON SCHEDULER]: Automated reminder call triggered for ${med.patient_name || 'Patient #' + med.patient_id} (${med.phone_number})...`);

      // Ensure AI reminder audio exists if not already pre-generated
      if (isAiEnabled && med.instruction_source !== 'recorded' && !med.reminder_audio_url) {
        try {
          const audioResult = await preGenerateReminderAudio({
            patientId: med.patient_id,
            medicationId: med.id,
            speakerId: 'female'
          });
          if (typeof audioResult === 'string' && (audioResult.startsWith('/audio/') || audioResult.startsWith('http'))) {
            const db = require('../db/connection');
            await db.prepare('UPDATE medications SET reminder_audio_url = ? WHERE id = ?').run(audioResult, med.id);
            med.reminder_audio_url = audioResult;
          }
        } catch (preErr) {
          console.warn('⚠️ [Cron Pre-call Audio notice]:', preErr.message);
        }
      }

      // Immediately create call_event to prevent duplicates
      const callEvent = await createCallEvent({
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
    } catch (callErr) {
      console.error(`❌ [Cron Call Error for ${med.patient_name || med.patient_id}]:`, callErr.message);
    }
  }

  // 3. Handle retries
  const callsNeedingRetry = await getCallsNeedingRetry();
  if (callsNeedingRetry.length > 0) {
    await processRetries(callsNeedingRetry);
  }
};

const startScheduler = () => {
  if (process.env.ENABLE_CRON_SCHEDULER === 'false') {
    console.log('⏸️  [CRON SCHEDULER]: Background scheduler is disabled (ENABLE_CRON_SCHEDULER=false).');
    return;
  }

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
