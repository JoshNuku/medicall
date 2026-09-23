require('dotenv').config();

const RETRY_NOT_TAKEN_MINUTES = parseInt(process.env.RETRY_NOT_TAKEN_MINUTES || '30', 10);
const RETRY_NO_ANSWER_MINUTES = parseInt(process.env.RETRY_NO_ANSWER_MINUTES || '120', 10);
const COLLISION_BUFFER_MINUTES = parseInt(process.env.COLLISION_BUFFER_MINUTES || '60', 10);

const UNIVERSAL_KEYS = {
  REPEAT: '6',
  REPEAT_ALT: '9',
  REQUEST_HELP: '0'
};

const CALL_TYPES = {
  REMINDER: 'reminder',
  RETRY: 'retry',
  RELISTEN: 'relisten',
  DIAGNOSTIC: 'diagnostic'
};

const CALL_OUTCOMES = {
  CONFIRMED: 'confirmed',
  NOT_TAKEN: 'not_taken',
  NO_ANSWER: 'no_answer',
  ANSWERED_NO_KEYPRESS: 'answered_no_keypress'
};

const ESCALATION_TYPES = {
  PHARMACIST_COST: 'pharmacist_cost',
  HEALTH_WORKER_SIDE_EFFECT: 'health_worker_side_effect',
  GENERAL_ATTENTION: 'general_attention',
  REPEATED_FORGETTING: 'repeated_forgetting',
  PATIENT_REQUEST_HELP: 'patient_requested_help',
  SAME_DAY_MULTIPLE_MISSES: 'same_day_multiple_misses'
};

const INSTRUCTION_CATEGORIES = {
  DOSAGE: 'dosage',
  FREQUENCY: 'frequency',
  TIMING: 'timing'
};

module.exports = {
  RETRY_NOT_TAKEN_MINUTES,
  RETRY_NO_ANSWER_MINUTES,
  COLLISION_BUFFER_MINUTES,
  UNIVERSAL_KEYS,
  CALL_TYPES,
  CALL_OUTCOMES,
  ESCALATION_TYPES,
  INSTRUCTION_CATEGORIES
};
