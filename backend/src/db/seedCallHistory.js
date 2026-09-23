const db = require('./connection');

const seedCallHistory = async () => {
  console.log('Seeding rich 7-day call history across patients into Neon PostgreSQL...');

  const patientsRes = await db.query('SELECT id, name FROM patients');
  const patients = patientsRes.rows;

  const dates = [
    { date: '2026-09-17', day: 'Mon' },
    { date: '2026-09-18', day: 'Tue' },
    { date: '2026-09-19', day: 'Wed' },
    { date: '2026-09-20', day: 'Thu' },
    { date: '2026-09-21', day: 'Fri' },
    { date: '2026-09-22', day: 'Sat' },
    { date: '2026-09-23', day: 'Sun' }
  ];

  // Clear existing call_events to re-seed clean realistic timeline
  await db.query('DELETE FROM call_events');

  for (const p of patients) {
    const medsRes = await db.query('SELECT id, drug_name, schedule_times FROM medications WHERE patient_id = $1', [p.id]);
    const meds = medsRes.rows;
    if (meds.length === 0) continue;

    const med = meds[0];
    const times = (med.schedule_times || '08:00, 20:00').split(',').map(t => t.trim());

    for (const d of dates) {
      for (const timeStr of times) {
        const scheduledTime = `${d.date}T${timeStr}:00Z`;
        let outcome = 'confirmed';
        let actualCallTime = `${d.date}T${timeStr}:42Z`;

        // Introduce realistic clinical variations
        if (p.id % 4 === 1 && (d.day === 'Tue' || d.day === 'Fri')) {
          outcome = 'no_answer';
        } else if (p.id % 3 === 0 && (d.day === 'Mon' || d.day === 'Thu')) {
          outcome = 'not_taken';
        } else if (p.id % 5 === 2 && (d.day === 'Wed' || d.day === 'Sat')) {
          outcome = 'no_answer';
        } else if (d.date === '2026-09-23' && timeStr > '16:00') {
          outcome = null;
          actualCallTime = null;
        }

        await db.query(`
          INSERT INTO call_events (
            patient_id, medication_id, scheduled_time, actual_call_time,
            call_type, outcome, attempt_number, dose_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          p.id,
          med.id,
          scheduledTime,
          actualCallTime,
          'reminder',
          outcome,
          1,
          d.date
        ]);
      }
    }
  }

  console.log('Seeded complete call history successfully.');
};

if (require.main === module) {
  seedCallHistory()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed call history:', err);
      process.exit(1);
    });
}

module.exports = seedCallHistory;
