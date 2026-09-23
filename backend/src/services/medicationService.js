const { getTemplateById } = require('../db/queries/templates');
const { createMedication } = require('../db/queries/medications');
const { getPatientById } = require('../db/queries/patients');

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
  let initialAudioUrl = audioFileUrl;

  const patient = patientId ? await getPatientById(patientId) : null;
  const selectedLang = (language || (patient && patient.preferred_language) || 'twi').toLowerCase();
  const isEnglish = selectedLang === 'english';

  if (instructionSource === 'template') {
    const dosage = dosageTemplateId ? await getTemplateById(dosageTemplateId) : null;
    if (isEnglish) {
      const drugLower = (drugName || '').toLowerCase();
      if (drugLower.includes('lisinopril')) {
        initialAudioUrl = '/audio/lisinopril_en.mp3';
      } else if (drugLower.includes('metformin')) {
        initialAudioUrl = '/audio/metformin_en.mp3';
      } else {
        initialAudioUrl = '/audio/default-reminder-en.mp3';
      }
    } else {
      // Immediate baseline audio so the record is created instantaneously (<50ms)
      initialAudioUrl = (dosage && dosage.audio_url) || '/audio/default-reminder.mp3';
    }
  } else if (!initialAudioUrl) {
    initialAudioUrl = isEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3';
  }

  // 1. Immediately create the medication regimen in DB so the UI responds instantly
  const createdMed = await createMedication({
    patient_id: patientId,
    drug_name: drugName,
    instruction_source: instructionSource,
    dosage_template_id: dosageTemplateId || null,
    frequency_template_id: frequencyTemplateId || null,
    timing_template_id: timingTemplateId || null,
    audio_url: initialAudioUrl,
    schedule_times: scheduleTimes,
    duration_days: parseInt(durationDays, 10) || 7,
    is_chronic: isChronic ? 1 : 0,
    language: isEnglish ? 'english' : 'twi'
  });

  // 2. Asynchronous Background Task: Generate Full Regimen Audio + First Daily Dose Reminder Audio
  if (instructionSource === 'template' && patientId && createdMed) {
    setImmediate(async () => {
      try {
        const { generateFullPrescriptionAudio, preGenerateReminderAudio } = require('./reminderPipelineService');

        console.log(`\n🎙️ [BACKGROUND AUDIO TASK]: Generating Full Prescription audio for Med #${createdMed.id}...`);
        await generateFullPrescriptionAudio({
          patientId,
          medicationId: createdMed.id
        });

        console.log(`🎙️ [BACKGROUND AUDIO TASK]: Pre-generating First Daily Dose Reminder for Med #${createdMed.id}...`);
        await preGenerateReminderAudio({
          patientId,
          medicationId: createdMed.id,
          speakerId: 'female'
        });

        console.log(`✓ [BACKGROUND AUDIO TASK]: Both audio tracks prepared for Patient #${patientId} (Med #${createdMed.id}).`);
      } catch (bgErr) {
        console.warn('⚠️ [Background Audio Task Notice]:', bgErr.message);
      }
    });
  }

  return createdMed;
};

module.exports = {
  registerMedication
};
