I'm building the backend for MediCall, a voice-call medication adherence system 
for a hackathon. Build this in stages, starting with the foundation.

STACK: Node.js + Express + SQLite (use better-sqlite3), node-cron, dotenv, 
Africa's Talking Node SDK

DATABASE SCHEMA (SQLite):

- patients: id, phone_number (unique), name, preferred_language, caregiver_phone, 
  caregiver_notified_at (datetime, nullable), enrolled_at, consent_given

- instruction_templates: id, category ("dosage"/"frequency"/"timing"), 
  label_english (shown to pharmacist, e.g. "Twice daily"), text_twi (verified 
  phrase, written by a human, never machine-translated), audio_url (optional 
  pre-recorded clip for this exact fragment)

- medications: id, patient_id (FK), drug_name (free text, not translated), 
  instruction_source ("template" or "recorded"), dosage_template_id (FK, 
  nullable), frequency_template_id (FK, nullable), timing_template_id (FK, 
  nullable), audio_url (final assembled or recorded instruction file), 
  schedule_times (comma-separated "HH:MM" strings, e.g. "08:00,14:00,20:00" 
  for a 3x-daily regimen), duration_days, is_chronic (boolean), created_at

- call_events: id, patient_id (FK), medication_id (FK), scheduled_time, 
  actual_call_time, call_type ("reminder"/"retry"/"relisten"/"diagnostic"), 
  outcome ("confirmed"/"not_taken"/"no_answer"/"answered_no_keypress"), 
  attempt_number, dose_date (date only, derived from scheduled_time, used to 
  group multiple doses within the same day)

- diagnostic_responses: id, call_event_id (FK), patient_id (FK), 
  reason ("cost"/"side_effects"/"forgot"/"other"), responded_at

- escalations: id, patient_id (FK), diagnostic_response_id (FK, nullable), 
  escalation_type ("pharmacist_cost"/"health_worker_side_effect"/
  "general_attention"/"repeated_forgetting"/"patient_requested_help"/
  "same_day_multiple_misses"), status ("open"/"resolved"), created_at, 
  resolved_at, resolved_by

IMPORTANT — no free-text English-to-Twi translation anywhere in this system. 
Dosage instructions are built ONE OF TWO WAYS ONLY:
1. Template mode: pharmacist picks drug name (free text) + dosage/frequency/timing 
   from dropdowns populated from instruction_templates. Backend assembles the 
   final Twi instruction from verified pre-written phrases (or stitches together 
   pre-recorded audio clips per fragment if audio_url exists), never generates 
   new Twi text from English input.
2. Recorded mode: pharmacist speaks the full instruction directly in Twi, 
   uploaded as an audio file, stored as-is.
Do not build any English-to-Twi translation step.

BUILD IN THIS ORDER:

STAGE 1 — Foundation
- Project structure, package.json, .env.example (AT_API_KEY, AT_USERNAME, PORT)
- Database setup script creating all tables above
- Seed instruction_templates with placeholder entries (~8 dosage, ~5 frequency, 
  ~4 timing) using obviously-fake Twi placeholders like "[TWI: twice daily]", 
  a Twi speaker on the team will replace these before demo, don't invent Twi
- Basic Express server with a health check route
- Set up swagger-jsdoc + swagger-ui-express, serving docs at /api-docs, and 
  document every route below as it's built via JSDoc comments above each 
  route handler

STAGE 2 — Frontend-facing CRUD endpoints
- POST /patients, GET /patients, GET /patients/:id
- GET /instruction-templates?category=dosage — dropdown options for frontend
- POST /patients/:id/medications — template mode or recorded mode (see above); 
  never store audio blobs in the database, only file paths/URLs in /public/audio
- GET /patients/:id/medications
- GET /patients/:id/logs (joins call_events + diagnostic_responses)
- GET /alerts (open escalations, joined with patient name)
- POST /alerts/:id/resolve

STAGE 3 — Africa's Talking voice webhooks (respond with valid AT XML)

Shared behavior across all voice webhooks: implement a single 
handleUniversalKeys(digit, callContext) function checked before any 
call-specific menu logic:
  - 9 = repeat the current instruction/menu (replay the same <Play>, 
    re-prompt for digits, don't advance call state)
  - 0 = request help (create an escalation with escalation_type 
    'patient_requested_help', end the call politely)

- POST /voice/reminder — plays medication's audio_url, then <GetDigits 
  numDigits="1"> for:
    1 = confirmed, 2 = not_taken (plus universal 9/0 above)
  callback to /voice/reminder/confirm
- POST /voice/reminder/confirm — logs outcome to call_events with dose_date 
  set to today's date
- POST /voice/inbound — relisten flow; look up patient by callerNumber, play 
  back their current medication's audio_url
- POST /voice/diagnostic — reason menu (1=cost, 2=side effects, 3=forgot, 
  4=other, plus universal 9/0), callback to /voice/diagnostic/confirm
- POST /voice/diagnostic/confirm — logs to diagnostic_responses, calls the 
  decision engine

STAGE 4 — Cron scheduler
- node-cron running '* * * * *'
- Every minute, find medications whose schedule_times matches current HH:MM 
  with no existing call_events row for that medication + today's dose_date + 
  that time + call_type='reminder'; trigger the call, insert the row 
  immediately to avoid duplicates
- Retry logic:
  - outcome='not_taken' → schedule a retry call_events row 30 minutes later
  - outcome='no_answer' or 'answered_no_keypress' → schedule a retry 2 hours 
    later
  - Before inserting any retry, check if the calculated retry time falls 
    within 60 minutes of the medication's next scheduled dose time that day; 
    if so, skip the retry entirely and let the next regular scheduled call 
    handle it instead, to avoid two calls colliding close together

STAGE 5 — Decision engine (decisionEngine.js, the real MVP, not a fallback)

Export decideNextAction(patientId, medicationId):

- Same-day tracking: count missed doses (not_taken, no_answer, 
  answered_no_keypress) grouped by dose_date for this medication
  - 2+ missed doses within the SAME dose_date → trigger diagnostic call 
    immediately, regardless of the cross-day rule below (this matters most 
    for multi-dose-per-day regimens like TB, where missing most of a day's 
    doses is urgent on its own)
- Cross-day tracking: if is_chronic is true and there are 2+ consecutive 
  dose_dates with at least one miss each → trigger diagnostic call (existing 
  rule, kept alongside the same-day rule above)
- If is_chronic is false, never trigger diagnostic flow regardless of misses
- On diagnostic_responses reason:
  - 'cost' → escalate 'pharmacist_cost' + immediate SMS alert to pharmacist
  - 'side_effects' → escalate 'health_worker_side_effect' + immediate SMS alert to nurse
  - 'forgot' → adapt schedule with 10-min pre-reminder call; UNLESS this is the 3rd+ consecutive 'forgot' for 
    this medication, in which case also escalate 'repeated_forgetting' via SMS
  - 'other' / unclear → escalate 'general_attention' + SMS alert
- Caregiver notification: if 2+ consecutive no_answer outcomes for the same 
  medication AND patient has a non-null caregiver_phone AND 
  caregiver_notified_at is null for this episode → send caregiver SMS (see 
  Stage 6), then set caregiver_notified_at to now; reset it to null once the 
  patient next confirms a dose successfully
- Write resulting escalations row wherever applicable

STAGE 6 — SMS additions
- Add sendSms(toNumber, message) helper using Africa's Talking's SMS API, 
  reusable across the codebase
- Immediate Clinician SMS: Every escalation immediately triggers an SMS to the 
  health worker/pharmacist (low-resource environment focus: no need to watch web dashboard).
- Caregiver notification message: "[Patient name] may have missed their 
  medication reminder. Please check in with them."
- Optional reminder-companion SMS alongside each outbound call or on patient preference (e.g. keypress 5).
- Handle SMS failures gracefully without breaking voice call workflows.

STAGE 7 — AI Agent & Adaptive Reminders (agent.js)
- ReAct Agent powered by Groq LLM (default: gpt-oss-120B / Llama 3) with tool calling:
  1. escalate_case: logs DB escalation AND immediately dispatches SMS alert to clinician
  2. editCronReminder: adds 10-min pre-reminder call when patient forgets
  3. notifybySMS: sends direct SMS reminder or companion text
- Context Pre-loading: Injects patient profile, drug schedule, missed doses, and diagnostic history directly into system prompt.
- Memory: Stored in agent_conversations table.
- Graceful Fallback: Seamlessly falls back to Stage 5 deterministic decision engine if LLM service is offline.