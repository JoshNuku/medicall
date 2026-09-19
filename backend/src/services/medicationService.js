const { getTemplateById } = require('../db/queries/templates');
const { createMedication } = require('../db/queries/medications');
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
  audioFileUrl
}) => {
  let finalAudioUrl = audioFileUrl;

  if (instructionSource === 'template') {
    const dosage = dosageTemplateId ? getTemplateById(dosageTemplateId) : null;
    const freq = frequencyTemplateId ? getTemplateById(frequencyTemplateId) : null;
    const timing = timingTemplateId ? getTemplateById(timingTemplateId) : null;

    // Assemble verified phrases (never translate raw English)
    const twiPhrases = [
      dosage ? dosage.text_twi : '',
      freq ? freq.text_twi : '',
      timing ? timing.text_twi : ''
    ].filter(Boolean);

    const assembledTwiText = twiPhrases.join('. ');

    // Attempt Khaya TTS synthesis, or fallback to relative template audio
    const synthesizedUrl = await synthesizeTwiSpeech(assembledTwiText);
    finalAudioUrl = synthesizedUrl || (dosage && dosage.audio_url) || '/audio/test_twi.mp3';
  }

  return createMedication({
    patient_id: patientId,
    drug_name: drugName,
    instruction_source: instructionSource,
    dosage_template_id: dosageTemplateId || null,
    frequency_template_id: frequencyTemplateId || null,
    timing_template_id: timingTemplateId || null,
    audio_url: finalAudioUrl,
    schedule_times: scheduleTimes,
    duration_days: parseInt(durationDays, 10) || 7,
    is_chronic: isChronic ? 1 : 0
  });
};

module.exports = {
  registerMedication
};
