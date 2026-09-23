import { Patient, InstructionTemplate, Medication, CallEvent, EscalationAlert } from './types';

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 30,
    name: 'Adwoa Agyepong',
    phone_number: '+233200193622',
    preferred_language: 'twi',
    caregiver_phone: '+233546007121',
    enrolled_at: '2026-09-20 09:12:56',
    consent_given: 1,
    adherence_rate: 54,
    total_calls: 13,
    active_medications_count: 1,
    current_medication_name: 'Amoxicillin 500mg',
    next_call_time: '14:00',
    last_call_time: new Date(Date.now() - 3600000).toISOString(),
    last_call_outcome: 'confirmed',
    status: 'attention'
  },
  {
    id: 39,
    name: 'Akosua Serwaa',
    phone_number: '+233244112233',
    preferred_language: 'twi',
    caregiver_phone: '+233501234567',
    enrolled_at: '2026-09-22 14:30:00',
    consent_given: 1,
    adherence_rate: 100,
    total_calls: 3,
    active_medications_count: 1,
    current_medication_name: 'Metformin 500mg',
    next_call_time: '18:00',
    last_call_time: new Date(Date.now() - 7200000).toISOString(),
    last_call_outcome: 'confirmed',
    status: 'active'
  },
  {
    id: 1,
    name: 'Kwame Mensah',
    phone_number: '+233241234567',
    preferred_language: 'twi',
    caregiver_phone: '+233551234567',
    enrolled_at: '2026-09-18 10:00:00',
    consent_given: 1,
    adherence_rate: 88,
    total_calls: 16,
    active_medications_count: 2,
    current_medication_name: 'Lisinopril 10mg',
    next_call_time: '08:00',
    last_call_time: new Date(Date.now() - 14400000).toISOString(),
    last_call_outcome: 'confirmed',
    status: 'active'
  },
  {
    id: 2,
    name: 'Abena Osei',
    phone_number: '+233509876543',
    preferred_language: 'twi',
    caregiver_phone: null,
    enrolled_at: '2026-09-19 11:20:00',
    consent_given: 1,
    adherence_rate: 67,
    total_calls: 9,
    active_medications_count: 1,
    current_medication_name: 'Amlodipine 5mg',
    next_call_time: '20:00',
    last_call_time: new Date(Date.now() - 28800000).toISOString(),
    last_call_outcome: 'not_taken',
    status: 'attention'
  },
  {
    id: 3,
    name: 'Kofi Boateng',
    phone_number: '+233271122334',
    preferred_language: 'english',
    caregiver_phone: '+233541122334',
    enrolled_at: '2026-09-21 08:45:00',
    consent_given: 1,
    adherence_rate: 92,
    total_calls: 12,
    active_medications_count: 1,
    current_medication_name: 'Artemether-Lumefantrine',
    next_call_time: '12:00',
    last_call_time: new Date(Date.now() - 10800000).toISOString(),
    last_call_outcome: 'confirmed',
    status: 'active'
  }
];

export const MOCK_TEMPLATES: InstructionTemplate[] = [
  { id: 1, category: 'dosage', label_english: '1 tablet', text_twi: 'Fa baa baako', audio_url: '/audio/templates/dose_1_tab.mp3' },
  { id: 2, category: 'dosage', label_english: '2 tablets', text_twi: 'Fa baa mmienu', audio_url: '/audio/templates/dose_2_tabs.mp3' },
  { id: 3, category: 'frequency', label_english: 'Once a day', text_twi: 'da biara pɛnkoro', audio_url: '/audio/templates/freq_once.mp3' },
  { id: 4, category: 'frequency', label_english: 'Twice a day', text_twi: 'da biara mprenu', audio_url: '/audio/templates/freq_twice.mp3' },
  { id: 5, category: 'frequency', label_english: 'Three times a day', text_twi: 'da biara mprɛnsa', audio_url: '/audio/templates/freq_thrice.mp3' },
  { id: 6, category: 'timing', label_english: 'After meals', text_twi: 'adidie akyi', audio_url: '/audio/templates/timing_after.mp3' },
  { id: 7, category: 'timing', label_english: 'Before meals', text_twi: 'ansa na woadidi', audio_url: '/audio/templates/timing_before.mp3' },
  { id: 8, category: 'timing', label_english: 'With food', text_twi: 'bere a woreye aduan no', audio_url: '/audio/templates/timing_with.mp3' }
];

export const MOCK_MEDICATIONS: Record<number, Medication[]> = {
  30: [
    {
      id: 37,
      patient_id: 30,
      drug_name: 'Amoxicillin 500mg',
      instruction_source: 'template',
      dosage_template_id: 1,
      frequency_template_id: 5,
      timing_template_id: 6,
      dosage_label: '1 tablet',
      frequency_label: 'Three times a day',
      timing_label: 'After meals',
      assembled_twi: 'Fa wo nnuro Amoxicillin 500mg. Fa baa baako. da biara mprɛnsa. adidie akyi. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.',
      audio_url: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166960/medicall/audio/static/twi_confirmed.mp3',
      reminder_audio_url: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790167061/medicall/audio/diagnostic_patient_30_1790167047303.mp3',
      schedule_times: '08:00,14:00,20:00',
      duration_days: 7,
      is_chronic: false,
      language: 'twi',
      created_at: '2026-09-20 09:15:00',
      status: 'active'
    }
  ],
  39: [
    {
      id: 46,
      patient_id: 39,
      drug_name: 'Metformin 500mg',
      instruction_source: 'template',
      dosage_template_id: 1,
      frequency_template_id: 3,
      timing_template_id: 7,
      dosage_label: '1 tablet',
      frequency_label: 'Once a day',
      timing_label: 'Before meals',
      assembled_twi: 'Fa wo nnuro Metformin 500mg. Fa baa baako. da biara pɛnkoro. ansa na woadidi.',
      audio_url: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166977/medicall/audio/static/default-reminder.mp3',
      schedule_times: '08:00',
      duration_days: 30,
      is_chronic: true,
      language: 'twi',
      created_at: '2026-09-22 14:35:00',
      status: 'active'
    }
  ],
  1: [
    {
      id: 1,
      patient_id: 1,
      drug_name: 'Lisinopril 10mg',
      instruction_source: 'template',
      dosage_template_id: 1,
      frequency_template_id: 3,
      timing_template_id: 6,
      dosage_label: '1 tablet',
      frequency_label: 'Once a day',
      timing_label: 'After meals',
      assembled_twi: 'Fa wo nnuro Lisinopril 10mg. Fa baa baako. da biara pɛnkoro. adidie akyi.',
      audio_url: 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166977/medicall/audio/static/default-reminder.mp3',
      schedule_times: '08:00',
      duration_days: 30,
      is_chronic: true,
      language: 'twi',
      created_at: '2026-09-18 10:10:00',
      status: 'active'
    }
  ]
};

export const MOCK_CALL_LOGS: Record<number, CallEvent[]> = {
  30: [
    {
      id: 189,
      call_event_id: 189,
      patient_id: 30,
      patient_name: 'Adwoa Agyepong',
      medication_id: 37,
      drug_name: 'Amoxicillin 500mg',
      scheduled_time: new Date(Date.now() - 3600000).toISOString(),
      actual_call_time: new Date(Date.now() - 3550000).toISOString(),
      call_type: 'diagnostic',
      outcome: 'confirmed',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0],
      diagnostic_reason: 'side_effects',
      diagnostic_note: 'Patient reported mild stomach irritation.'
    },
    {
      id: 184,
      call_event_id: 184,
      patient_id: 30,
      patient_name: 'Adwoa Agyepong',
      medication_id: 37,
      drug_name: 'Amoxicillin 500mg',
      scheduled_time: new Date(Date.now() - 7200000).toISOString(),
      actual_call_time: new Date(Date.now() - 7100000).toISOString(),
      call_type: 'reminder',
      outcome: 'not_taken',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0]
    },
    {
      id: 182,
      call_event_id: 182,
      patient_id: 30,
      patient_name: 'Adwoa Agyepong',
      medication_id: 37,
      drug_name: 'Amoxicillin 500mg',
      scheduled_time: new Date(Date.now() - 25200000).toISOString(),
      actual_call_time: new Date(Date.now() - 25200000).toISOString(),
      call_type: 'relisten',
      outcome: 'confirmed',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0]
    }
  ]
};

export const MOCK_ALERTS: EscalationAlert[] = [
  {
    id: 22,
    patient_id: 30,
    patient_name: 'Adwoa Agyepong',
    patient_phone: '+233200193622',
    escalation_type: 'health_worker_side_effect',
    human_label: 'Side effects',
    details: 'Patient reported side effects during reminder check-in. Flagged for pharmacist consult.',
    status: 'open',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 19,
    patient_id: 2,
    patient_name: 'Abena Osei',
    patient_phone: '+233509876543',
    escalation_type: 'repeated_forgetting',
    human_label: 'Repeated forgetting',
    details: 'Missed 3 consecutive scheduled doses. Automated caregiver SMS alert dispatched.',
    status: 'open',
    created_at: new Date(Date.now() - 18000000).toISOString()
  }
];

export const MOCK_TODAY_CALLS: CallEvent[] = [
  {
    id: 190,
    patient_id: 39,
    patient_name: 'Akosua Serwaa',
    medication_id: 46,
    drug_name: 'Metformin 500mg',
    scheduled_time: new Date(Date.now() - 1800000).toISOString(),
    actual_call_time: new Date(Date.now() - 1790000).toISOString(),
    call_type: 'reminder',
    outcome: 'confirmed',
    attempt_number: 1,
    dose_date: new Date().toISOString().split('T')[0]
  },
  {
    id: 189,
    patient_id: 30,
    patient_name: 'Adwoa Agyepong',
    medication_id: 37,
    drug_name: 'Amoxicillin 500mg',
    scheduled_time: new Date(Date.now() - 3600000).toISOString(),
    actual_call_time: new Date(Date.now() - 3550000).toISOString(),
    call_type: 'diagnostic',
    outcome: 'confirmed',
    attempt_number: 1,
    dose_date: new Date().toISOString().split('T')[0]
  },
  {
    id: 184,
    patient_id: 30,
    patient_name: 'Adwoa Agyepong',
    medication_id: 37,
    drug_name: 'Amoxicillin 500mg',
    scheduled_time: new Date(Date.now() - 7200000).toISOString(),
    actual_call_time: new Date(Date.now() - 7100000).toISOString(),
    call_type: 'reminder',
    outcome: 'not_taken',
    attempt_number: 1,
    dose_date: new Date().toISOString().split('T')[0]
  }
];
