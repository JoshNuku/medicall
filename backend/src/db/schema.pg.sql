-- MediCall PostgreSQL Database Schema for Neon
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'twi',
  caregiver_phone TEXT,
  caregiver_notified_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consent_given INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS instruction_templates (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('dosage', 'frequency', 'timing')),
  label_english TEXT NOT NULL,
  text_twi TEXT NOT NULL,
  audio_url TEXT
);

CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  instruction_source TEXT NOT NULL CHECK (instruction_source IN ('template', 'recorded')),
  dosage_template_id INTEGER REFERENCES instruction_templates(id),
  frequency_template_id INTEGER REFERENCES instruction_templates(id),
  timing_template_id INTEGER REFERENCES instruction_templates(id),
  audio_url TEXT NOT NULL,
  reminder_audio_url TEXT,
  schedule_times TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  is_chronic INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'twi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_events (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_call_time TIMESTAMPTZ,
  call_type TEXT NOT NULL CHECK (call_type IN ('reminder', 'retry', 'relisten', 'diagnostic')),
  outcome TEXT CHECK (outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  dose_date TEXT NOT NULL,
  audio_url TEXT
);

CREATE TABLE IF NOT EXISTS diagnostic_responses (
  id SERIAL PRIMARY KEY,
  call_event_id INTEGER NOT NULL REFERENCES call_events(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('cost', 'side_effects', 'forgot', 'other')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS escalations (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnostic_response_id INTEGER REFERENCES diagnostic_responses(id) ON DELETE SET NULL,
  escalation_type TEXT NOT NULL CHECK (escalation_type IN (
    'pharmacist_cost', 'health_worker_side_effect', 'general_attention',
    'repeated_forgetting', 'patient_requested_help', 'same_day_multiple_misses'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS agent_conversations (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid IVR and scheduler lookups
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_events_sched ON call_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_call_events_patient ON call_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
