const db = require('./connection');

const seedCallHistory = () => {
  console.log('Seeding rich 7-day call history across patients into SQLite...');

  const patients = db.prepare('SELECT id, name FROM patients').all();
  const insertCall = db.prepare(`
    INSERT INTO call_events (
      patient_id, medication_id, scheduled_time, actual_call_time,
      call_type, outcome, attempt_number, dose_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dates = [
    { date: '2026-09-11', day: 'Mon' },
    { date: '2026-09-12', day: 'Tue' },
    { date: '2026-09-13', day: 'Wed' },
    { date: '2026-09-14', day: 'Thu' },
    { date: '2026-09-15', day: 'Fri' },
    { date: '2026-09-16', day: 'Sat' },
    { date: '2026-09-17', day: 'Sun' }
  ];

  // Map patient medications
  const getMedStmt = db.prepare('SELECT id, drug_name, schedule_times FROM medications WHERE patient_id = ?');

  // Clear existing call_events to re-seed clean realistic timeline
  db.prepare('DELETE FROM call_events').run();

  for (const p of patients) {
    const meds = getMedStmt.all(p.id);
    if (meds.length === 0) continue;

    const med = meds[0];
    const times = (med.schedule_times || '08:00, 20:00').split(',').map(t => t.trim());

    for (const d of dates) {
      for (const timeStr of times) {
        const scheduledTime = `${d.date} ${timeStr}:00`;
        let outcome = 'confirmed';
        let actualCallTime = `${d.date} ${timeStr}:42`;

        // Introduce realistic clinical variations
        if (p.id === 3 && (d.day === 'Tue' || d.day === 'Fri')) {
          outcome = 'no_answer';
        } else if (p.id === 4 && (d.day === 'Mon' || d.day === 'Thu')) {
          outcome = 'not_taken';
        } else if (p.id === 8 && (d.day === 'Wed' || d.day === 'Sat')) {
          outcome = 'no_answer';
        } else if (p.id === 1 && d.day === 'Tue' && timeStr.includes('20:00')) {
          outcome = 'not_taken';
        } else if (d.date === '2026-09-17' && timeStr > '14:00') {
          // Future calls today are pending (null outcome)
          outcome = null;
          actualCallTime = null;
        }

        insertCall.run(
          p.id,
          med.id,
          scheduledTime,
          actualCallTime,
          'reminder',
          outcome,
          1,
          d.date
        );
      }
    }
  }

  console.log('Seeded complete call history successfully.');
};

if (require.main === module) {
  seedCallHistory();
}

module.exports = seedCallHistory;
