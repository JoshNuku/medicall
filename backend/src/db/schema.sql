CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'twi',
  caregiver_phone TEXT,
  caregiver_notified_at DATETIME,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consent_given INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS instruction_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('dosage', 'frequency', 'timing')),
  label_english TEXT NOT NULL,
  text_twi TEXT NOT NULL,
  audio_url TEXT
);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  instruction_source TEXT NOT NULL CHECK (instruction_source IN ('template', 'recorded')),
  dosage_template_id INTEGER REFERENCES instruction_templates(id),
  frequency_template_id INTEGER REFERENCES instruction_templates(id),
  timing_template_id INTEGER REFERENCES instruction_templates(id),
  audio_url TEXT NOT NULL,
  schedule_times TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  is_chronic INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'twi',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time DATETIME NOT NULL,
  actual_call_time DATETIME,
  call_type TEXT NOT NULL CHECK (call_type IN ('reminder', 'retry', 'relisten', 'diagnostic')),
  outcome TEXT CHECK (outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  dose_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_event_id INTEGER NOT NULL REFERENCES call_events(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('cost', 'side_effects', 'forgot', 'other')),
  responded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnostic_response_id INTEGER REFERENCES diagnostic_responses(id) ON DELETE SET NULL,
  escalation_type TEXT NOT NULL CHECK (escalation_type IN (
    'pharmacist_cost', 'health_worker_side_effect', 'general_attention',
    'repeated_forgetting', 'patient_requested_help', 'same_day_multiple_misses'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS agent_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
