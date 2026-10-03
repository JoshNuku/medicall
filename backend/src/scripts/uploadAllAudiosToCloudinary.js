const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const audioDir = path.join(__dirname, '../../public/audio');
const mapFilePath = path.join(__dirname, '../config/cloudinaryAudioMap.json');

// Ensure config dir exists
const configDir = path.dirname(mapFilePath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Load existing map if any
let audioMap = {};
if (fs.existsSync(mapFilePath)) {
  try {
    audioMap = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
  } catch (_) {
    audioMap = {};
  }
}

async function uploadSingleFile(fileName) {
  const filePath = path.join(audioDir, fileName);
  const ext = path.extname(fileName).toLowerCase();
  if (!['.mp3', '.wav', '.webm', '.ogg', '.m4a'].includes(ext)) return null;

  const localRelative = `/audio/${fileName}`;
  if (audioMap[localRelative] && audioMap[localRelative].startsWith('https://res.cloudinary.com')) {
    console.log(`⏩ [Skip]: ${fileName} already uploaded -> ${audioMap[localRelative]}`);
    return { fileName, localRelative, cloudUrl: audioMap[localRelative] };
  }

  const publicId = path.parse(fileName).name;

  try {
    console.log(`☁️  [Uploading]: ${fileName} (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)...`);
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video', // Audio is stored as video in Cloudinary
      folder: 'medicall/audio',
      public_id: publicId,
      overwrite: true,
    });

    const cloudUrl = result.secure_url;
    audioMap[localRelative] = cloudUrl;
    audioMap[fileName] = cloudUrl; // Also map just the filename for flexible lookup
    console.log(`✅ [Uploaded]: ${fileName} -> ${cloudUrl}`);

    // Save incrementally
    fs.writeFileSync(mapFilePath, JSON.stringify(audioMap, null, 2), 'utf8');
    return { fileName, localRelative, cloudUrl };
  } catch (err) {
    console.error(`❌ [Failed]: ${fileName} ->`, err.message);
    return null;
  }
}

async function uploadAll() {
  console.log('🚀 Starting batch upload of all local audio & fallbacks to Cloudinary...');
  console.log(`📁 Source directory: ${audioDir}`);

  if (!fs.existsSync(audioDir)) {
    console.error(`Directory not found: ${audioDir}`);
    return;
  }

  const files = fs.readdirSync(audioDir);
  console.log(`Found ${files.length} total entries.`);

  // Upload with concurrency limit of 4
  const concurrency = 4;
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    await Promise.all(chunk.map((f) => uploadSingleFile(f)));
  }

  console.log('\n=============================================');
  console.log(`🎉 Finished! Total mapped Cloudinary audio files: ${Object.keys(audioMap).length / 2}`);
  console.log(`💾 Saved permanent audio map to: ${mapFilePath}`);
  console.log('=============================================\n');
}

uploadAll();
