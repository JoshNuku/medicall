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

  const patient = patientId ? getPatientById(patientId) : null;
  // If pharmacist explicitly selected language during prescription, respect that choice; otherwise fall back to patient's preferred language
  const selectedLang = (language || (patient && patient.preferred_language) || 'twi').toLowerCase();
  const isEnglish = selectedLang === 'english';

  if (instructionSource === 'template') {
    const dosage = dosageTemplateId ? getTemplateById(dosageTemplateId) : null;
    const freq = frequencyTemplateId ? getTemplateById(frequencyTemplateId) : null;
    const timing = timingTemplateId ? getTemplateById(timingTemplateId) : null;

    if (isEnglish) {
      const drugLower = (drugName || '').toLowerCase();
      if (drugLower.includes('lisinopril')) {
        finalAudioUrl = '/audio/lisinopril_en.mp3';
      } else if (drugLower.includes('metformin')) {
        finalAudioUrl = '/audio/metformin_en.mp3';
      } else {
        finalAudioUrl = '/audio/default-reminder-en.mp3';
      }
    } else {
      const twiPhrases = [
        dosage ? dosage.text_twi : '',
        freq ? freq.text_twi : '',
        timing ? timing.text_twi : ''
      ].filter(Boolean);

      const assembledTwiText = `Fa wo nnuro ${drugName}. ${twiPhrases.join('. ')}. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.`;

      // Attempt Khaya TTS synthesis, or fallback to relative template audio
      const synthesizedUrl = await synthesizeTwiSpeech(assembledTwiText);
      finalAudioUrl = synthesizedUrl || (dosage && dosage.audio_url) || '/audio/default-reminder.mp3';
    }
  } else if (!finalAudioUrl) {
    finalAudioUrl = isEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3';
  }

  const createdMed = createMedication({
    patient_id: patientId,
    drug_name: drugName,
    instruction_source: instructionSource,
    dosage_template_id: dosageTemplateId || null,
    frequency_template_id: frequencyTemplateId || null,
    timing_template_id: timingTemplateId || null,
    audio_url: finalAudioUrl,
    schedule_times: scheduleTimes,
    duration_days: parseInt(durationDays, 10) || 7,
    is_chronic: isChronic ? 1 : 0,
    language: isEnglish ? 'english' : 'twi'
  });

  // Pre-generate full prescription audio immediately in background/pipeline if needed
  if (instructionSource === 'template' && patientId && createdMed) {
    const { generateFullPrescriptionAudio } = require('./reminderPipelineService');
    generateFullPrescriptionAudio({
      patientId,
      medicationId: createdMed.id
    }).catch(err => console.warn('⚠️ [Prescription Audio Pre-Gen Notice]:', err.message));
  }

  return createdMed;
};

module.exports = {
  registerMedication
};
