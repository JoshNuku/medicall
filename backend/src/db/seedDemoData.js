const { query } = require('./connection');

const seedDemoData = async () => {
  const row = await query('SELECT COUNT(*) as count FROM patients');
  if (row.rows[0] && parseInt(row.rows[0].count, 10) > 0) {
    return;
  }

  console.log('Seeding initial realistic Ghanaian patient records into Neon PostgreSQL...');

  // 1. Insert Patients
  const patientsData = [
    ['+233200193622', 'Adwoa Agyepong', 'twi', '+233546007121', 1, '2026-09-20 09:12:56'],
    ['+233244112233', 'Akosua Serwaa', 'twi', '+233501234567', 1, '2026-09-22 14:30:00'],
    ['+233244567890', 'Ama Mensah', 'twi', '+233501234567', 1, '2026-08-12 09:30:00'],
    ['+233208901234', 'Kwame Asante', 'twi', '+233549876543', 1, '2026-07-20 14:15:00'],
    ['+233553456789', 'Akosua Boateng', 'twi', null, 1, '2026-09-01 11:00:00'],
    ['+233276543210', 'Yaw Boateng', 'english', '+233265432109', 1, '2026-06-15 08:00:00'],
    ['+233507890123', 'Abena Appiah', 'twi', '+233241122334', 1, '2026-08-25 13:40:00'],
    ['+233249012345', 'Kofi Osei', 'english', null, 1, '2026-05-10 10:20:00']
  ];

  const patientMap = {};
  for (const p of patientsData) {
    const res = await query(
      `INSERT INTO patients (phone_number, name, preferred_language, caregiver_phone, consent_given, enrolled_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      p
    );
    patientMap[p[1]] = res.rows[0].id;
  }

  // 2. Insert Medications
  const adwoaId = patientMap['Adwoa Agyepong'];
  const akosuaId = patientMap['Akosua Serwaa'];

  const defaultReminderAudio = 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790166977/medicall/audio/static/default-reminder.mp3';
  const diagnosticAudio = 'https://res.cloudinary.com/deplhwhk7/video/upload/v1790167061/medicall/audio/diagnostic_patient_30_1790167047303.mp3';

  const medsData = [
    [adwoaId, 'Amoxicilin 500mg', 'template', 1, 5, 6, defaultReminderAudio, diagnosticAudio, '08:00,14:00,20:00', 7, 0, '2026-09-20 09:15:00', 'twi'],
    [akosuaId, 'Metformin 500mg', 'template', 1, 3, 7, defaultReminderAudio, null, '08:00', 30, 1, '2026-09-22 14:35:00', 'twi']
  ];

  const medMap = {};
  for (const m of medsData) {
    const res = await query(
      `INSERT INTO medications (
        patient_id, drug_name, instruction_source,
        dosage_template_id, frequency_template_id, timing_template_id,
        audio_url, reminder_audio_url, schedule_times, duration_days, is_chronic, created_at, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      m
    );
    medMap[m[1]] = res.rows[0].id;
  }

  // 3. Insert baseline call events & escalations for demo
  const adwoaMedId = medMap['Amoxicilin 500mg'];
  if (adwoaId && adwoaMedId) {
    const callRes = await query(
      `INSERT INTO call_events (
        patient_id, medication_id, scheduled_time, actual_call_time,
        call_type, outcome, attempt_number, dose_date, audio_url
      ) VALUES ($1, $2, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 'reminder', 'not_taken', 1, CURRENT_DATE, $3) RETURNING id`,
      [adwoaId, adwoaMedId, diagnosticAudio]
    );

    const callEventId = callRes.rows[0].id;
    const diagRes = await query(
      `INSERT INTO diagnostic_responses (call_event_id, patient_id, reason, responded_at)
       VALUES ($1, $2, 'side_effects', NOW() - INTERVAL '55 minutes') RETURNING id`,
      [callEventId, adwoaId]
    );

    await query(
      `INSERT INTO escalations (patient_id, diagnostic_response_id, escalation_type, status, created_at, details)
       VALUES ($1, $2, 'health_worker_side_effect', 'open', NOW() - INTERVAL '55 minutes', 'Patient reported side effects during reminder check-in.')`,
      [adwoaId, diagRes.rows[0].id]
    );
  }

  console.log('✓ Seeded demo patients, medications, and escalations into Neon PostgreSQL.');
};

module.exports = seedDemoData;
