export type Language = 'twi' | 'english';

export type PatientStatus = 'active' | 'attention';

export interface Patient {
  id: number;
  phone_number: string;
  name: string;
  preferred_language: Language;
  caregiver_phone: string | null;
  caregiver_notified_at?: string | null;
  enrolled_at: string;
  consent_given: boolean | number;
  // Computed / summary fields for UI convenience
  adherence_rate: number | null;
  total_calls?: number;
  active_medications_count: number;
  current_medication_name?: string;
  next_call_time?: string;
  last_call_time?: string;
  last_call_outcome?: CallOutcome;
  status: PatientStatus;
}

export type TemplateCategory = 'dosage' | 'frequency' | 'timing';

export interface InstructionTemplate {
  id: number;
  category: TemplateCategory;
  label_english: string;
  text_twi: string;
  audio_url: string | null;
}

export type InstructionSource = 'template' | 'recorded';

export interface Medication {
  id: number;
  patient_id: number;
  drug_name: string;
  instruction_source: InstructionSource;
  dosage_template_id: number | null;
  frequency_template_id: number | null;
  timing_template_id: number | null;
  // Denormalized labels for quick display
  dosage_label?: string;
  frequency_label?: string;
  timing_label?: string;
  assembled_twi?: string;
  audio_url: string;
  schedule_times: string; // Comma separated e.g. "08:00,20:00"
  duration_days: number;
  is_chronic: boolean;
  language?: 'twi' | 'english';
  created_at: string;
  status: 'active' | 'completed' | 'paused';
}

export type CallType = 'reminder' | 'retry' | 'relisten' | 'diagnostic';

export type CallOutcome = 'confirmed' | 'not_taken' | 'no_answer' | 'answered_no_keypress' | 'pending' | 'uncalled';

export type DiagnosticReason = 'cost' | 'side_effects' | 'forgot' | 'other';

export interface CallEvent {
  id: number;
  call_event_id?: number;
  patient_id: number;
  patient_name: string;
  medication_id: number;
  drug_name: string;
  scheduled_time: string;
  actual_call_time: string | null;
  call_type: CallType;
  outcome: CallOutcome;
  attempt_number: number;
  dose_date: string;
  diagnostic_reason?: DiagnosticReason | null;
  diagnostic_note?: string | null;
}

export type EscalationType =
  | 'pharmacist_cost'
  | 'health_worker_side_effect'
  | 'repeated_forgetting'
  | 'patient_requested_help'
  | 'same_day_multiple_misses'
  | 'general_attention';

export interface EscalationAlert {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  diagnostic_response_id?: number | null;
  escalation_type: EscalationType;
  human_label: string;
  details: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;
}

export interface DailyAdherence {
  day: string;
  date: string;
  rate: number;
  confirmed_doses: number;
  total_doses: number;
}

export interface DashboardMetrics {
  total_patients: number;
  patients_delta: string;
  overall_adherence: number;
  adherence_delta: string;
  calls_today: number;
  calls_today_confirmed: number;
  open_alerts: number;
  urgent_alerts: number;
}
