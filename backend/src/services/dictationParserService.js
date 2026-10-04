require('dotenv').config();
const { sendChatCompletion } = require('./groqClient');
const { getPatientByPhoneNumber, getPatientById } = require('../db/queries/patients');
const { getTemplatesByCategory } = require('../db/queries/templates');

const DEFAULT_MODEL = process.env.GROQ_LLM_MODEL || 'openai/gpt-oss-20b';

const SYSTEM_PROMPT = `You are a clinical transcription assistant for MediCall, a medication adherence platform in Ghana.
Your job is to parse a spoken prescription/enrollment dictation from a healthcare worker/pharmacist and extract structured clinical data for a form.

Return ONLY valid JSON matching this schema:
{
  "action": "prescribe_and_enroll" | "prescribe_only" | "enroll_only",
  "patient": {
    "name": string | null,
    "phone_number": string | null, // E.164 format for Ghana (+233XXXXXXXXX). Convert "053..." or "53..." to "+23353..."
    "preferred_language": "twi" | "english" | "ga", // default "twi" unless English/Ga explicitly stated
    "caregiver_phone": string | null
  },
  "medication": {
    "drug_name": string | null,
    "dosage_template_id": number | null, // 1: "1 tablet", 2: "2 tablets", 3: "half tablet", 4: "1 capsule", 5: "2 capsules", 6: "5ml (1 teaspoon)", 7: "10ml (2 teaspoons)", 8: "15ml (1 tablespoon)"
    "dosage_label": string | null,
    "frequency_template_id": number | null, // 9: "Once daily", 10: "Twice daily", 11: "Three times daily", 12: "Four times daily", 13: "Every other day"
    "frequency_label": string | null,
    "timing_template_id": number | null, // 14: "Before meals", 15: "After meals", 16: "With food", 17: "At bedtime"
    "timing_label": string | null,
    "schedule_times": string, // comma separated 24h format HH:mm. e.g. "08:00, 14:00, 20:00". Infer logical times if not exact.
    "duration_days": number, // default 7 unless specified
    "is_chronic": boolean
  },
  "assumptions": string[], // List any assumptions made (e.g., "Inferred schedule times 08:00, 20:00 for twice daily.")
  "missing_fields": string[] // List any missing critical info (e.g. "Phone number not provided")
}

Clinical rules:
- Ghana phone numbers: 10 digits starting with 0 (e.g. 0536287642) become +233536287642. 9 digits (536287642) become +233536287642.
- If times are "morning and evening", use "08:00, 20:00".
- If "morning, afternoon, evening" or "3 times a day", use "08:00, 14:00, 20:00".
- If "morning" or "once daily", use "08:00".
- If "4 times a day", use "06:00, 12:00, 18:00, 22:00".
- If dosage is "one" or "1", match to 1 tablet (id 1) or 1 capsule (id 4).
- If timing is "after eating" or "after food", match to 15 ("After meals").
- Return strictly JSON with no markdown wrapping or preamble.`;

const { translateTwiToEnglish } = require('./khayaService');

/**
 * Parses transcript into structured patient & medication JSON
 * @param {string} transcript - The spoken text transcript
 * @param {Object} context - Optional context like existing patientId or language
 * @returns {Promise<Object>} Structured data with SQLite cross-referencing
 */
const parseDictation = async (transcript, context = {}) => {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcript text is empty');
  }

  let promptInput = `Extract prescription data from this pharmacist dictation:\n"${transcript}"`;
  let translatedText = null;

  // If Asante Twi is selected, translate via Khaya AI first
  if (context.language === 'twi' || context.language === 'tw') {
    console.log('🇬🇭 [DictationParser]: Translating Asante Twi transcript via Khaya AI...');
    try {
      translatedText = await translateTwiToEnglish(transcript);
      if (translatedText) {
        console.log(`✓ [DictationParser]: Khaya Translation: "${translatedText}"`);
        promptInput = `Extract prescription data from this pharmacist dictation spoken in Asante Twi:\nOriginal Twi: "${transcript}"\nEnglish Translation (via Khaya AI): "${translatedText}"\nNote: The patient's preferred language is Asante Twi.`;
      }
    } catch (err) {
      console.warn('[DictationParser]: Khaya translation warning:', err.message);
    }
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: promptInput }
  ];

  const completion = await sendChatCompletion({
    model: DEFAULT_MODEL,
    messages,
    temperature: 0.1
  });

  if (!completion || !completion.choices || !completion.choices[0]) {
    throw new Error('No response from Groq extraction model');
  }

  const rawContent = completion.choices[0].message.content.trim();
  let parsed;
  try {
    // Strip possible markdown code blocks if returned
    const cleanJson = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('[DictationParser] Failed to parse JSON from LLM output:', rawContent);
    throw new Error('LLM output was not valid JSON');
  }

  // Cross-reference with database for existing patient
  if (context.patientId) {
    const existing = getPatientById(context.patientId);
    if (existing) {
      parsed.patient = {
        ...parsed.patient,
        id: existing.id,
        name: existing.name,
        phone_number: existing.phone_number,
        preferred_language: existing.preferred_language,
        caregiver_phone: existing.caregiver_phone,
        is_existing: true
      };
      parsed.action = 'prescribe_only';
    }
  } else if (parsed.patient && parsed.patient.phone_number) {
    const existing = getPatientByPhoneNumber(parsed.patient.phone_number);
    if (existing) {
      parsed.patient.is_existing = true;
      parsed.patient.id = existing.id;
      parsed.patient.existing_name = existing.name;
      parsed.assumptions = parsed.assumptions || [];
      parsed.assumptions.push(`Matched existing patient "${existing.name}" (ID #${existing.id}) in database by phone number.`);
    } else {
      parsed.patient.is_existing = false;
    }
  }

  parsed.raw_transcript = transcript;
  parsed.translated_text = translatedText;
  return parsed;
};

module.exports = {
  parseDictation
};
