const { getTemplateById } = require('../db/queries/templates');
const { createMedication } = require('../db/queries/medications');
const { getPatientById } = require('../db/queries/patients');
const { synthesizeTwiSpeech } = require('./khayaService');

const registerMedication = async ({
  patientId,
  drugName,
  instructionSource,
  dosageTemplateId,
  frequencyTemplateId,
  timingTemplateId,
  scheduleTimes,
  durationDays,
  isChronic,
  audioFileUrl,
  language
}) => {
  let finalAudioUrl = audioFileUrl;
  let finalReminderAudioUrl = null;
  let initialAudioStatus = 'ready';

  const patient = patientId ? await getPatientById(patientId) : null;
  // If pharmacist explicitly selected language during prescription, respect that choice; otherwise fall back to patient's preferred language
  const selectedLang = (language || (patient && patient.preferred_language) || 'twi').toLowerCase();
  const isEnglish = selectedLang === 'english';

  if (instructionSource === 'template') {
    const dosage = dosageTemplateId ? await getTemplateById(dosageTemplateId) : null;
    const freq = frequencyTemplateId ? await getTemplateById(frequencyTemplateId) : null;
    const timing = timingTemplateId ? await getTemplateById(timingTemplateId) : null;

    if (isEnglish) {
      const drugLower = (drugName || '').toLowerCase();
      if (drugLower.includes('lisinopril')) {
        finalAudioUrl = '/audio/lisinopril_en.mp3';
      } else if (drugLower.includes('metformin')) {
        finalAudioUrl = '/audio/metformin_en.mp3';
      } else {
        finalAudioUrl = '/audio/default-reminder-en.mp3';
      }
      finalReminderAudioUrl = finalAudioUrl;
      initialAudioStatus = 'ready';
    } else {
      // Instant template fallback so record is functional immediately
      finalAudioUrl = (dosage && dosage.audio_url) || '/audio/default-reminder.mp3';
      finalReminderAudioUrl = '/audio/default-reminder.mp3';
      initialAudioStatus = 'generating'; // Will be synthesized in background
    }
  } else if (instructionSource === 'recorded' && audioFileUrl) {
    // Set immediate raw recording so it's instantly playable, then process FFmpeg merge in background
    finalAudioUrl = audioFileUrl;
    finalReminderAudioUrl = audioFileUrl;
    initialAudioStatus = 'generating';
  } else if (!finalAudioUrl) {
    finalAudioUrl = isEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3';
    initialAudioStatus = 'ready';
  }

  const createdMed = await createMedication({
    patient_id: patientId,
    drug_name: drugName,
    instruction_source: instructionSource,
    dosage_template_id: dosageTemplateId || null,
    frequency_template_id: frequencyTemplateId || null,
    timing_template_id: timingTemplateId || null,
    audio_url: finalAudioUrl,
    reminder_audio_url: finalReminderAudioUrl,
    audio_status: initialAudioStatus,
    schedule_times: scheduleTimes,
    duration_days: parseInt(durationDays, 10) || 7,
    is_chronic: isChronic ? 1 : 0,
    language: isEnglish ? 'english' : 'twi'
  });

  // Background Async Processing (Non-blocking: returns HTTP 201 in <50ms)
  if (initialAudioStatus === 'generating' && createdMed) {
    setImmediate(async () => {
      const db = require('../db/connection');
      try {
        if (instructionSource === 'template') {
          console.log(`\n⚡ [BACKGROUND TASK] Starting audio synthesis for Med #${createdMed.id} (${drugName})...`);
          const { generateFullPrescriptionAudio, generateDoseReminderAudio } = require('./reminderPipelineService');
          
          await Promise.allSettled([
            generateFullPrescriptionAudio({ patientId, medicationId: createdMed.id }),
            generateDoseReminderAudio({ patientId, medicationId: createdMed.id })
          ]);

          await db.prepare('UPDATE medications SET audio_status = ? WHERE id = ?').run('ready', createdMed.id);
          console.log(`✓ [BACKGROUND TASK] Completed audio synthesis for Med #${createdMed.id}`);
        } else if (instructionSource === 'recorded' && audioFileUrl) {
          console.log(`\n⚡ [BACKGROUND TASK] Starting recorded audio conversion for Med #${createdMed.id}...`);
          const { prepareRecordedMedicationAudio } = require('./audioMergeService');
          const mergedUrl = await prepareRecordedMedicationAudio(audioFileUrl, selectedLang);
          
          const path = require('path');
          const fs = require('fs');
          const baseName = path.basename(audioFileUrl).replace(/\.[^/.]+$/, '').replace(/^(recording_|converted_|merged_|relisten_)/, '');
          const relistenPath = `/audio/relisten_${baseName}.mp3`;
          const relistenAudio = fs.existsSync(path.join(__dirname, '../../public', relistenPath)) ? relistenPath : mergedUrl;

          await db.prepare('UPDATE medications SET audio_url = ?, reminder_audio_url = ?, audio_status = ? WHERE id = ?')
            .run(relistenAudio, mergedUrl, 'ready', createdMed.id);
          console.log(`✓ [BACKGROUND TASK] Completed recorded audio merge for Med #${createdMed.id}`);
        }
      } catch (bgErr) {
        console.error(`⚠️ [BACKGROUND TASK ERROR] Med #${createdMed.id}:`, bgErr.message);
        try {
          await db.prepare('UPDATE medications SET audio_status = ? WHERE id = ?').run('ready', createdMed.id);
        } catch (_) {}
      }
    });
  }

  return createdMed;
};

module.exports = {
  registerMedication
};
