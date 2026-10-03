const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const mapFilePath = path.join(__dirname, '../config/cloudinaryAudioMap.json');
if (!fs.existsSync(mapFilePath)) {
  console.error('Audio map file not found:', mapFilePath);
  process.exit(1);
}

const audioMap = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));

// 1. Update SQLite
console.log('🔄 Updating SQLite database with Cloudinary URLs...');
try {
  const sqliteDb = require('../db/connection');
  const meds = sqliteDb.prepare('SELECT id, audio_url, reminder_audio_url FROM medications').all();
  let updatedMedsCount = 0;

  for (const med of meds) {
    let newAudioUrl = med.audio_url;
    let newReminderUrl = med.reminder_audio_url;

    if (med.audio_url && audioMap[med.audio_url]) {
      newAudioUrl = audioMap[med.audio_url];
    } else if (med.audio_url && audioMap[path.basename(med.audio_url)]) {
      newAudioUrl = audioMap[path.basename(med.audio_url)];
    }

    if (med.reminder_audio_url && audioMap[med.reminder_audio_url]) {
      newReminderUrl = audioMap[med.reminder_audio_url];
    } else if (med.reminder_audio_url && audioMap[path.basename(med.reminder_audio_url)]) {
      newReminderUrl = audioMap[path.basename(med.reminder_audio_url)];
    }

    if (newAudioUrl !== med.audio_url || newReminderUrl !== med.reminder_audio_url) {
      sqliteDb.prepare('UPDATE medications SET audio_url = ?, reminder_audio_url = ? WHERE id = ?')
        .run(newAudioUrl, newReminderUrl, med.id);
      updatedMedsCount++;
    }
  }
  console.log(`✅ Updated ${updatedMedsCount} medications in SQLite.`);
} catch (err) {
  console.error('SQLite update error:', err.message);
}

// 2. Update Neon PostgreSQL
if (process.env.DATABASE_URL) {
  console.log('🔄 Updating Neon PostgreSQL database with Cloudinary URLs...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.query('SELECT id, audio_url, reminder_audio_url FROM medications')
    .then(async (res) => {
      let pgUpdatedCount = 0;
      for (const med of res.rows) {
        let newAudioUrl = med.audio_url;
        let newReminderUrl = med.reminder_audio_url;

        if (med.audio_url && audioMap[med.audio_url]) {
          newAudioUrl = audioMap[med.audio_url];
        } else if (med.audio_url && audioMap[path.basename(med.audio_url)]) {
          newAudioUrl = audioMap[path.basename(med.audio_url)];
        }

        if (med.reminder_audio_url && audioMap[med.reminder_audio_url]) {
          newReminderUrl = audioMap[med.reminder_audio_url];
        } else if (med.reminder_audio_url && audioMap[path.basename(med.reminder_audio_url)]) {
          newReminderUrl = audioMap[path.basename(med.reminder_audio_url)];
        }

        if (newAudioUrl !== med.audio_url || newReminderUrl !== med.reminder_audio_url) {
          await pool.query(
            'UPDATE medications SET audio_url = $1, reminder_audio_url = $2 WHERE id = $3',
            [newAudioUrl, newReminderUrl, med.id]
          );
          pgUpdatedCount++;
        }
      }
      console.log(`✅ Updated ${pgUpdatedCount} medications in Neon PostgreSQL.`);
      await pool.end();
    })
    .catch((err) => {
      console.error('Neon update error:', err.message);
      pool.end();
    });
}
