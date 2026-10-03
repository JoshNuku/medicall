const { Pool } = require('pg');
const sqliteDb = require('../db/connection');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncToNeon() {
  console.log('🚀 Connecting to Neon PostgreSQL...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE medications ADD COLUMN IF NOT EXISTS audio_status TEXT DEFAULT 'ready';
      ALTER TABLE medications ADD COLUMN IF NOT EXISTS reminder_audio_url TEXT;
      ALTER TABLE medications ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'twi';
      ALTER TABLE call_events ADD COLUMN IF NOT EXISTS audio_url TEXT;
      TRUNCATE TABLE patients, medications, call_events, diagnostic_responses, escalations CASCADE;
    `);

    // 1. Sync Patients
    const patients = sqliteDb.prepare('SELECT * FROM patients').all();
    console.log(`📋 Syncing ${patients.length} patients...`);
    for (const p of patients) {
      await client.query(`
        INSERT INTO patients (id, phone_number, name, preferred_language, caregiver_phone, caregiver_notified_at, enrolled_at, consent_given)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [p.id, p.phone_number, p.name, p.preferred_language, p.caregiver_phone, p.caregiver_notified_at, p.enrolled_at, p.consent_given]);
    }
    // Update serial sequence
    await client.query(`SELECT setval('patients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM patients));`);

    // 2. Sync Medications
    const meds = sqliteDb.prepare('SELECT * FROM medications').all();
    console.log(`💊 Syncing ${meds.length} medications...`);
    for (const m of meds) {
      await client.query(`
        INSERT INTO medications (id, patient_id, drug_name, instruction_source, dosage_template_id, frequency_template_id, timing_template_id, audio_url, reminder_audio_url, schedule_times, duration_days, is_chronic, language, audio_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          drug_name = EXCLUDED.drug_name,
          instruction_source = EXCLUDED.instruction_source,
          dosage_template_id = EXCLUDED.dosage_template_id,
          frequency_template_id = EXCLUDED.frequency_template_id,
          timing_template_id = EXCLUDED.timing_template_id,
          audio_url = EXCLUDED.audio_url,
          reminder_audio_url = EXCLUDED.reminder_audio_url,
          schedule_times = EXCLUDED.schedule_times,
          duration_days = EXCLUDED.duration_days,
          is_chronic = EXCLUDED.is_chronic,
          language = EXCLUDED.language,
          audio_status = EXCLUDED.audio_status;
      `, [m.id, m.patient_id, m.drug_name, m.instruction_source, m.dosage_template_id, m.frequency_template_id, m.timing_template_id, m.audio_url, m.reminder_audio_url, m.schedule_times, m.duration_days, m.is_chronic, m.language || 'twi', m.audio_status || 'ready', m.created_at]);
    }
    await client.query(`SELECT setval('medications_id_seq', (SELECT COALESCE(MAX(id), 1) FROM medications));`);

    // 3. Sync Call Events
    const calls = sqliteDb.prepare('SELECT * FROM call_events').all();
    console.log(`📞 Syncing ${calls.length} call events...`);
    for (const c of calls) {
      await client.query(`
        INSERT INTO call_events (id, patient_id, medication_id, scheduled_time, actual_call_time, call_type, outcome, attempt_number, dose_date, audio_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          actual_call_time = EXCLUDED.actual_call_time,
          outcome = EXCLUDED.outcome,
          attempt_number = EXCLUDED.attempt_number,
          audio_url = EXCLUDED.audio_url;
      `, [c.id, c.patient_id, c.medication_id, c.scheduled_time, c.actual_call_time, c.call_type, c.outcome, c.attempt_number, c.dose_date, c.audio_url]);
    }
    await client.query(`SELECT setval('call_events_id_seq', (SELECT COALESCE(MAX(id), 1) FROM call_events));`);

    // 4. Sync Diagnostic Responses
    const diags = sqliteDb.prepare('SELECT * FROM diagnostic_responses').all();
    console.log(`🩺 Syncing ${diags.length} diagnostic responses...`);
    for (const d of diags) {
      await client.query(`
        INSERT INTO diagnostic_responses (id, call_event_id, patient_id, reason, responded_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          reason = EXCLUDED.reason;
      `, [d.id, d.call_event_id, d.patient_id, d.reason, d.responded_at]);
    }
    await client.query(`SELECT setval('diagnostic_responses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM diagnostic_responses));`);

    // 5. Sync Escalations
    const alerts = sqliteDb.prepare('SELECT * FROM escalations').all();
    console.log(`🚨 Syncing ${alerts.length} escalations...`);
    for (const a of alerts) {
      await client.query(`
        INSERT INTO escalations (id, patient_id, diagnostic_response_id, escalation_type, status, created_at, resolved_at, resolved_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          resolved_at = EXCLUDED.resolved_at,
          resolved_by = EXCLUDED.resolved_by;
      `, [a.id, a.patient_id, a.diagnostic_response_id, a.escalation_type, a.status, a.created_at, a.resolved_at, a.resolved_by]);
    }
    await client.query(`SELECT setval('escalations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM escalations));`);

    await client.query('COMMIT');
    console.log('✅ SQLite data synced to Neon PostgreSQL successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Data sync error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

syncToNeon();
