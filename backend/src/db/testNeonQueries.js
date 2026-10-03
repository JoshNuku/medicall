const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
SELECT 
  p.id, 
  p.phone_number, 
  p.name, 
  p.preferred_language, 
  p.caregiver_phone, 
  p.enrolled_at, 
  p.consent_given,
  latest_call.actual_call_time AS last_call_time,
  latest_call.scheduled_time AS last_scheduled_time,
  latest_call.outcome AS last_call_outcome,
  COALESCE(stats.total_calls, 0) AS total_calls,
  COALESCE(stats.confirmed_calls, 0) AS confirmed_calls,
  stats.adherence_rate
FROM patients p
LEFT JOIN call_events latest_call ON latest_call.id = (
  SELECT id FROM call_events 
  WHERE patient_id = p.id AND (outcome IS NOT NULL OR actual_call_time IS NOT NULL)
  ORDER BY COALESCE(actual_call_time, scheduled_time) DESC, id DESC 
  LIMIT 1
)
LEFT JOIN (
  SELECT 
    patient_id,
    COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END) AS total_calls,
    COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS confirmed_calls,
    ROUND(CAST(COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS NUMERIC) * 100.0 / NULLIF(COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END), 0)) AS adherence_rate
  FROM call_events
  GROUP BY patient_id
) stats ON p.id = stats.patient_id
ORDER BY p.enrolled_at DESC;
`;

pool.query(sql)
  .then(res => {
    console.log(`✅ GET ALL PATIENTS NEON SUCCESS: ${res.rows.length} patients found!`);
    console.log('Sample patient row:', res.rows[0]);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Query error:', err);
    pool.end();
  });
