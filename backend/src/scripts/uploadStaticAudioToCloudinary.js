require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadAudioFile, isCloudinaryConfigured } = require('../services/cloudinaryService');

const staticFiles = [
  'twi_confirmed.mp3',
  'en_confirmed.mp3',
  'twi_not_taken_ack.mp3',
  'twi_diagnostic_reason.mp3',
  'english_diagnostic_reason.mp3',
  'twi_diagnostic_ack.mp3',
  'en_diagnostic_ack.mp3',
  'twi_inbound_intro.mp3',
  'twi_outbound_reminder.mp3',
  'default-reminder.mp3',
  'default-reminder-en.mp3',
  'twi_cost_barrier.mp3',
  'en_cost_barrier.mp3',
  'twi_side_effects.mp3',
  'en_side_effects.mp3',
  'twi_forgot.mp3',
  'en_forgot.mp3',
  'twi_early_reminder.mp3',
  'en_early_reminder.mp3',
  'twi_pharmacist_alert.mp3',
  'en_pharmacist_alert.mp3',
  'twi_invalid_key.mp3',
  'en_invalid_key.mp3',
  'metformin_en.mp3',
  'lisinopril_en.mp3'
];

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('Cloudinary credentials not found.');
    process.exit(1);
  }

  console.log('=== UPLOADING ALL DEFAULT AUDIO FILES TO CLOUDINARY ===\n');
  const urls = {};
  const audioDir = path.join(__dirname, '../../public/audio');

  for (const filename of staticFiles) {
    const filePath = path.join(audioDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filename}`);
      continue;
    }

    const publicId = path.basename(filename, '.mp3').replace(/-/g, '_');
    console.log(`Uploading ${filename}...`);
    const url = await uploadAudioFile(filePath, {
      folder: 'medicall/audio/static',
      public_id: publicId
    });

    if (url) {
      urls[publicId] = url;
      console.log(`✓ ${publicId} -> ${url}`);
    }
  }

  console.log('\n=== UPLOAD SUMMARY FOR CLOUDINARY SERVICE ===');
  console.log('const CLOUDINARY_STATIC_AUDIO = ' + JSON.stringify(urls, null, 2) + ';');
}

main().catch(console.error);
