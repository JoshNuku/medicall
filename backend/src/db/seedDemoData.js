const db = require('./connection');

const seedDemoData = () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  if (row && row.count > 0) {
    return;
  }

  console.log('Seeding initial realistic Ghanaian patient records into SQLite...');

  // 1. Insert Patients
  const insertPatient = db.prepare(`
    INSERT INTO patients (phone_number, name, preferred_language, caregiver_phone, consent_given, enrolled_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const patientsData = [
    ['+233244567890', 'Ama Mensah', 'twi', '+233501234567', 1, '2026-08-12 09:30:00'],
    ['+233208901234', 'Kwame Asante', 'twi', '+233549876543', 1, '2026-07-20 14:15:00'],
    ['+233553456789', 'Akosua Boateng', 'twi', null, 1, '2026-09-01 11:00:00'],
    ['+233276543210', 'Yaw Boateng', 'english', '+233265432109', 1, '2026-06-15 08:00:00'],
    ['+233507890123', 'Abena Appiah', 'twi', '+233241122334', 1, '2026-08-25 13:40:00'],
    ['+233249012345', 'Kofi Osei', 'english', null, 1, '2026-05-10 10:20:00'],
    ['+233591234567', 'Efua Danquah', 'twi', '+233203344556', 1, '2026-09-05 15:10:00'],
    ['+233234567891', 'Emmanuel Asante', 'twi', null, 1, '2026-08-30 16:00:00']
  ];

  const patientIds = [];
  for (const p of patientsData) {
    const res = insertPatient.run(p[0], p[1], p[2], p[3], p[4], p[5]);
    patientIds.push(res.lastInsertRowid);
  }

  // 2. Insert Medications
  const insertMed = db.prepare(`
    INSERT INTO medications (
      patient_id, drug_name, instruction_source,
      dosage_template_id, frequency_template_id, timing_template_id,
      audio_url, schedule_times, duration_days, is_chronic, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const medsData = [
    // Ama Mensah
    [patientIds[0], 'Amoxicillin 500mg', 'template', 1, 10, 15, '/audio/amoxicillin_twi.mp3', '08:00,20:00', 7, 0, '2026-09-12 08:00:00'],
    [patientIds[0], 'Paracetamol 500mg', 'recorded', null, null, null, '/audio/recorded_paracetamol.mp3', '14:00', 5, 0, '2026-09-14 10:00:00'],
    // Kwame Asante
    [patientIds[1], 'Metformin 500mg', 'template', 1, 10, 16, '/audio/metformin_twi.mp3', '08:30,20:30', 90, 1, '2026-07-20 14:30:00'],
    // Akosua Boateng
    [patientIds[2], 'Artemether/Lumefantrine', 'template', 2, 10, 16, '/audio/artemether_twi.mp3', '09:00,21:00', 3, 0, '2026-09-17 09:00:00'],
    // Yaw Boateng
    [patientIds[3], 'Lisinopril 10mg', 'template', 1, 9, 14, '/audio/lisinopril_en.mp3', '09:15', 60, 1, '2026-06-15 08:15:00'],
    // Abena Appiah
    [patientIds[4], 'Amlodipine 5mg', 'template', 1, 9, 14, '/audio/amlodipine.mp3', '08:00', 90, 1, '2026-08-25 14:00:00'],
    // Kofi Osei
    [patientIds[5], 'Metformin 850mg', 'template', 1, 10, 16, '/audio/metformin.mp3', '09:15,21:15', 90, 1, '2026-05-10 11:00:00'],
    // Efua Danquah
    [patientIds[6], 'Amoxicillin 250mg', 'template', 1, 10, 15, '/audio/amoxicillin.mp3', '08:00,20:00', 7, 0, '2026-09-05 16:00:00'],
    // Emmanuel Asante
    [patientIds[7], 'Ciprofloxacin 500mg', 'template', 1, 10, 15, '/audio/ciprofloxacin.mp3', '08:00,20:00', 7, 0, '2026-08-30 16:30:00']
  ];

  const medIds = [];
  for (const m of medsData) {
    const res = insertMed.run(...m);
    medIds.push(res.lastInsertRowid);
  }

  // 3. Insert Call Events (Today & recent days)
  const insertCall = db.prepare(`
    INSERT INTO call_events (
      patient_id, medication_id, scheduled_time, actual_call_time,
      call_type, outcome, attempt_number, dose_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayStr = '2026-09-17';
  const callsData = [
    // Today's calls
    [patientIds[0], medIds[0], `${todayStr} 08:00:00`, `${todayStr} 08:02:14`, 'reminder', 'confirmed', 1, todayStr],
    [patientIds[1], medIds[2], `${todayStr} 08:30:00`, `${todayStr} 08:31:05`, 'reminder', 'confirmed', 1, todayStr],
    [patientIds[2], medIds[3], `${todayStr} 09:00:00`, `${todayStr} 09:00:48`, 'reminder', 'no_answer', 1, todayStr],
    [patientIds[5], medIds[6], `${todayStr} 09:15:00`, `${todayStr} 09:15:32`, 'reminder', 'confirmed', 1, todayStr],
    [patientIds[4], medIds[5], `${todayStr} 09:45:00`, `${todayStr} 09:46:10`, 'reminder', 'not_taken', 1, todayStr],
    [patientIds[3], medIds[4], `${todayStr} 10:15:00`, `${todayStr} 10:15:40`, 'reminder', 'answered_no_keypress', 1, todayStr],
    [patientIds[7], medIds[8], `${todayStr} 11:20:00`, `${todayStr} 11:20:50`, 'reminder', 'no_answer', 1, todayStr],

    // Patient 1 (Ama Mensah) previous call history
    [patientIds[0], medIds[0], '2026-09-16 20:00:00', '2026-09-16 20:01:00', 'reminder', 'confirmed', 1, '2026-09-16'],
    [patientIds[0], medIds[0], '2026-09-16 14:00:00', '2026-09-16 14:00:45', 'reminder', 'no_answer', 1, '2026-09-16'],
    [patientIds[0], medIds[0], '2026-09-16 14:15:00', '2026-09-16 14:16:12', 'retry', 'confirmed', 2, '2026-09-16'],
    [patientIds[0], medIds[0], '2026-09-15 08:00:00', '2026-09-15 08:01:20', 'diagnostic', 'not_taken', 1, '2026-09-15']
  ];

  const callIds = [];
  for (const c of callsData) {
    const res = insertCall.run(...c);
    callIds.push(res.lastInsertRowid);
  }

  // 4. Insert Diagnostic Responses
  const insertDiag = db.prepare(`
    INSERT INTO diagnostic_responses (call_event_id, patient_id, reason, responded_at)
    VALUES (?, ?, ?, ?)
  `);

  // Ama Mensah reported cost barrier on callIds[10]
  const diag1 = insertDiag.run(callIds[10], patientIds[0], 'cost', '2026-09-15 08:01:45');

  // 5. Insert Escalations (Alerts)
  const insertEscalation = db.prepare(`
    INSERT INTO escalations (patient_id, diagnostic_response_id, escalation_type, status, created_at)
    VALUES (?, ?, ?, 'open', ?)
  `);

  insertEscalation.run(patientIds[0], diag1.lastInsertRowid, 'pharmacist_cost', '2026-09-17 08:45:00');
  insertEscalation.run(patientIds[3], null, 'health_worker_side_effect', '2026-09-17 09:15:00');
  insertEscalation.run(patientIds[2], null, 'repeated_forgetting', '2026-09-17 10:00:00');
  insertEscalation.run(patientIds[7], null, 'same_day_multiple_misses', '2026-09-17 11:20:00');
  insertEscalation.run(patientIds[4], null, 'patient_requested_help', '2026-09-17 12:05:00');
  insertEscalation.run(patientIds[1], null, 'pharmacist_cost', '2026-09-16 15:30:00');
  insertEscalation.run(patientIds[6], null, 'general_attention', '2026-09-16 17:10:00');
  insertEscalation.run(patientIds[5], null, 'health_worker_side_effect', '2026-09-15 21:40:00');

  console.log('Demo Ghanaian patient records seeded successfully into SQLite.');
};

module.exports = seedDemoData;
