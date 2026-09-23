const schemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Invalid request input' },
      status: { type: 'integer', example: 400 }
    }
  },
  Patient: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      phone_number: { type: 'string', example: '+233546007121' },
      name: { type: 'string', example: 'Kwame Mensah' },
      preferred_language: { type: 'string', example: 'twi' },
      caregiver_phone: { type: 'string', example: '+233501234567' },
      enrolled_at: { type: 'string', example: '2026-09-15T08:00:00.000Z' },
      consent_given: { type: 'integer', example: 1 }
    }
  },
  Medication: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      patient_id: { type: 'integer', example: 1 },
      drug_name: { type: 'string', example: 'Amoxicillin 500mg' },
      instruction_source: { type: 'string', enum: ['template', 'recorded'], example: 'template' },
      audio_url: { type: 'string', example: '/audio/khaya_reminder.mp3' },
      schedule_times: { type: 'string', example: '08:00,14:00,20:00' },
      duration_days: { type: 'integer', example: 7 },
      is_chronic: { type: 'integer', example: 0 }
    }
  },
  CreateMedicationPayload: {
    type: 'object',
    required: ['drug_name', 'instruction_source', 'schedule_times'],
    properties: {
      drug_name: { type: 'string', example: 'Amoxicillin 500mg' },
      instruction_source: { type: 'string', enum: ['template', 'recorded'], example: 'template' },
      dosage_template_id: { type: 'integer', example: 1 },
      frequency_template_id: { type: 'integer', example: 10 },
      timing_template_id: { type: 'integer', example: 15 },
      schedule_times: { type: 'string', example: '08:00,14:00,20:00' },
      duration_days: { type: 'integer', example: 7 },
      is_chronic: { type: 'boolean', example: false },
      audio: { type: 'string', format: 'binary', description: 'Audio file (recorded mode)' }
    }
  },
  InstructionTemplate: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      category: { type: 'string', enum: ['dosage', 'frequency', 'timing'], example: 'dosage' },
      label_english: { type: 'string', example: '1 tablet' },
      text_twi: { type: 'string', example: '[TWI: 1 tablet]' },
      audio_url: { type: 'string', nullable: true, example: null }
    }
  },
  EscalationAlert: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      patient_id: { type: 'integer', example: 1 },
      patient_name: { type: 'string', example: 'Kwame Mensah' },
      phone_number: { type: 'string', example: '+233546007121' },
      caregiver_phone: { type: 'string', example: '+233501234567' },
      escalation_type: { type: 'string', example: 'pharmacist_cost' },
      status: { type: 'string', example: 'open' },
      created_at: { type: 'string', example: '2026-09-15T08:30:00.000Z' }
    }
  }
};

module.exports = schemas;
