/**
 * MediCall Clinical Encouragement & Motivation Service
 *
 * Provides rotating, culturally authentic words of encouragement to celebrate
 * dose confirmations, verbal echo for keypress verification, and neutral privacy screening.
 */

const { getCloudinaryAudioUrl } = require('./cloudinaryService');

const TWI_ENCOURAGEMENT_AUDIOS = [
  {
    file: 'twi_encouragement_1.mp3',
    text: "Medaase pa ara! Kɔ so bɔ mmɔden. Aduro a worenom yi bɛma wo ho atɔ wo ntɛm pa ara. Yɛwɔ w'akyi!"
  },
  {
    file: 'twi_encouragement_2.mp3',
    text: "Woabɔ mmɔden sɛ worehwɛ w'apɔmuden so ɛnnɛ. Wo ho bɛyɛ den da biara da. Nyame mma wo ho nyɛ den!"
  },
  {
    file: 'twi_encouragement_3.mp3',
    text: "Medaase sɛ woafa w'aduro no. Wo apɔmuden ho hia yɛn pa ara. Hwɛ wo ho so yie, na yɛbɛkae wo bio!"
  }
];

const ENGLISH_ENCOURAGEMENTS = [
  (name) => `Thank you for taking your medication, ${name || 'there'}! Every dose brings you one step closer to full health and strength. Keep up the wonderful work!`,
  (name) => `Great job taking your medication today, ${name || 'there'}! You are taking control of your health, and you will feel much stronger each day. Stay blessed!`,
  (name) => `Dose confirmed, ${name || 'there'}! We are so proud of your dedication to your health. Remember, your healthcare team is right behind you every day. Take care!`
];

/**
 * Returns a warm encouragement audio URL for Asante Twi speakers.
 * Rotates dynamically based on callEventId or timestamp so calls stay fresh.
 */
function getTwiEncouragementAudio(callEventId, baseUrl) {
  const index = Math.abs(Number(callEventId) || Date.now()) % TWI_ENCOURAGEMENT_AUDIOS.length;
  const choice = TWI_ENCOURAGEMENT_AUDIOS[index];
  return {
    file: choice.file,
    url: getCloudinaryAudioUrl(choice.file, baseUrl),
    text: choice.text
  };
}

/**
 * Returns a warm spoken encouragement message for English speakers.
 */
function getEnglishEncouragement(patientName, callEventId) {
  const index = Math.abs(Number(callEventId) || Date.now()) % ENGLISH_ENCOURAGEMENTS.length;
  return ENGLISH_ENCOURAGEMENTS[index](patientName);
}

/**
 * Verbal Echo Audio for Twi dose confirmation with Undo prompt
 */
function getTwiEchoConfirmedUndoAudio(baseUrl) {
  return {
    file: 'twi_echo_confirmed_undo.mp3',
    url: getCloudinaryAudioUrl('twi_echo_confirmed_undo.mp3', baseUrl),
    text: "Wopere baako sɛ woafa w'aduro. Medaase pa ara! Sɛ ɛyɛ mfomsoɔ a, klike zero ntɛm ara."
  };
}

/**
 * Stage 1 Neutral Privacy Screening Audio (Asante Twi)
 */
function getTwiNeutralScreeningAudio(baseUrl) {
  return {
    file: 'twi_neutral_screening.mp3',
    url: getCloudinaryAudioUrl('twi_neutral_screening.mp3', baseUrl),
    text: "Medaase, MediCall na ɛrefrɛ wo. Sɛ wodeɛ a, klike baako na tie wo nkra pɛpɛɛpɛ."
  };
}

/**
 * Verbal Echo Spoken Messages for English calls
 */
function getVerbalEchoText(dtmfDigits, patientName, drugName) {
  const name = patientName || 'there';
  const drug = drugName || 'your medication';

  switch (String(dtmfDigits)) {
    case '1':
      return `You pressed 1 to confirm your dose of ${drug}. Thank you, ${name}! (If this was a mistake, press 0 now for help).`;
    case '2':
      return `You pressed 2 to report side effects from ${drug}. We have recorded this and are alerting your healthcare team right now to review your medication.`;
    case '3':
      return `You pressed 3 to report medication cost or refill issues. We have notified your pharmacist to assist you with refill options.`;
    case '4':
      return `You pressed 4 to request an earlier reminder. We have adjusted your schedule to call you earlier tomorrow.`;
    case '0':
      return `Connecting you to your pharmacist helpline. Please stay on the line...`;
    default:
      return `You pressed ${dtmfDigits}. Your response has been recorded.`;
  }
}

module.exports = {
  getTwiEncouragementAudio,
  getEnglishEncouragement,
  getTwiEchoConfirmedUndoAudio,
  getTwiNeutralScreeningAudio,
  getVerbalEchoText,
  TWI_ENCOURAGEMENT_AUDIOS,
  ENGLISH_ENCOURAGEMENTS
};
