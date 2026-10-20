const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

/**
 * Ensures an audio file is in standard MP3 format compatible with Africa's Talking telephony.
 * Converts .webm, .ogg, .wav, etc. into high-compatibility MP3.
 */
async function convertToMp3(inputFilePath, outputFilePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioChannels(1) // Mono for cellular telephony
      .audioFrequency(24000) // 24kHz telephony standard
      .save(outputFilePath)
      .on('end', () => resolve(outputFilePath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Concatenates two MP3 files into a single seamless audio file.
 */
async function concatAudioFiles(inputA, inputB, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputA)
      .input(inputB)
      .complexFilter(['[0:a][1:a]concat=n=2:v=0:a=1[out]'])
      .map('[out]')
      .audioCodec('libmp3lame')
      .audioChannels(1)
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Ensures an audio asset exists locally on Render/ephemeral disks by downloading from Cloudinary if missing.
 */
async function ensureLocalAudioFile(filename, targetPath) {
  if (fs.existsSync(targetPath)) return true;
  try {
    const { getCloudinaryAudioUrl } = require('./cloudinaryService');
    const remoteUrl = getCloudinaryAudioUrl(filename);
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      console.log(`[AudioMerge] Downloading missing asset ${filename} from Cloudinary CDN: ${remoteUrl}...`);
      const res = await fetch(remoteUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, buffer);
        console.log(`✓ [AudioMerge] Successfully cached ${filename} locally (${buffer.length} bytes)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[AudioMerge] Failed to download remote asset ${filename}:`, err.message);
  }
  return false;
}

/**
 * Merges a pharmacist's recorded voice note into two telephony-grade MP3 assets:
 * 1. merged_<id>.mp3: For Outbound Reminders (voice note + 1=taken, 2=not taken, 9=repeat, 0=help menu)
 * 2. relisten_<id>.mp3: For Inbound Helpline & Full Prescription (voice note + unified keypress menu)
 * 
 * @param {string} recordedRelativePath - e.g. "/audio/recording_123.webm"
 * @param {string} language - "twi" or "english"
 * @returns {Promise<string>} - The reminder merged path (/audio/merged_<id>.mp3)
 */
async function prepareRecordedMedicationAudio(recordedRelativePath, language = 'twi') {
  if (!recordedRelativePath) return null;

  const audioDir = path.join(__dirname, '../../public/audio');
  const frontendAudioDir = path.join(__dirname, '../../../frontend/public/audio');

  const filename = path.basename(recordedRelativePath);
  const inputFullPath = path.join(audioDir, filename);

  if (!fs.existsSync(inputFullPath)) {
    console.warn(`[AudioMerge] Source file not found: ${inputFullPath}`);
    return recordedRelativePath;
  }

  const isEnglish = (language || '').toLowerCase() === 'english';
  const menuFileName = isEnglish ? 'en_keypress_menu.mp3' : 'twi_keypress_menu.mp3';
  const trailerFileName = isEnglish ? 'en_keypress_trailer.mp3' : 'twi_keypress_trailer.mp3';

  const menuFullPath = path.join(audioDir, menuFileName);
  const trailerFullPath = path.join(audioDir, trailerFileName);

  // Ensure menu and trailer files are present on disk (auto-fetch from Cloudinary on Render)
  await ensureLocalAudioFile(menuFileName, menuFullPath);
  await ensureLocalAudioFile(trailerFileName, trailerFullPath);

  const baseName = path.parse(filename).name.replace(/^(merged_|converted_|relisten_)/, '');
  const tempConvertedPath = path.join(audioDir, `converted_${baseName}.mp3`);
  const finalMergedFilename = `merged_${baseName}.mp3`;
  const finalMergedPath = path.join(audioDir, finalMergedFilename);
  const finalRelistenFilename = `relisten_${baseName}.mp3`;
  const finalRelistenPath = path.join(audioDir, finalRelistenFilename);

  try {
    // Step 1: Convert recorded audio to standard MP3
    console.log(`[AudioMerge] Converting ${filename} to standard MP3 telephony format...`);
    await convertToMp3(inputFullPath, tempConvertedPath);

    // Step 2: Generate Outbound Reminder audio (Instruction + Menu: 1=taken, 2=not taken, 9=repeat, 0=help)
    if (fs.existsSync(menuFullPath)) {
      console.log(`[AudioMerge] Concatenating reminder audio with ${menuFileName}...`);
      await concatAudioFiles(tempConvertedPath, menuFullPath, finalMergedPath);
    } else {
      fs.copyFileSync(tempConvertedPath, finalMergedPath);
    }

    // Step 3: Generate Inbound Helpline & Relisten audio with unified interactive options (1=taken, 2=not taken, 9=repeat, 0=help)
    const trailingMenuFile = fs.existsSync(menuFullPath) ? menuFullPath : (fs.existsSync(trailerFullPath) ? trailerFullPath : null);
    if (trailingMenuFile) {
      console.log(`[AudioMerge] Concatenating helpline relisten audio with ${path.basename(trailingMenuFile)}...`);
      await concatAudioFiles(tempConvertedPath, trailingMenuFile, finalRelistenPath);
    } else {
      fs.copyFileSync(tempConvertedPath, finalRelistenPath);
    }

    // Sync generated MP3s to frontend public directory
    if (fs.existsSync(frontendAudioDir)) {
      fs.copyFileSync(finalMergedPath, path.join(frontendAudioDir, finalMergedFilename));
      fs.copyFileSync(finalRelistenPath, path.join(frontendAudioDir, finalRelistenFilename));
      console.log(`[AudioMerge] Synced ${finalMergedFilename} and ${finalRelistenFilename} to frontend/public/audio/`);
    }

    console.log(`✓ [AudioMerge] Successfully generated reminder audio: /audio/${finalMergedFilename}`);
    console.log(`✓ [AudioMerge] Successfully generated relisten audio: /audio/${finalRelistenFilename}`);
    return `/audio/${finalMergedFilename}`;
  } catch (err) {
    console.error('[AudioMerge Error]:', err.message);
    return fs.existsSync(tempConvertedPath) ? `/audio/converted_${baseName}.mp3` : recordedRelativePath;
  }
}

/**
 * Returns the correct relisten audio URL for an inbound helpline call.
 * Never plays the 1=taken, 2=not taken reminder menu on an inbound call!
 */
function getRelistenAudioUrl(medication, language = 'twi', baseUrl = '') {
  if (!medication) return null;
  const isEnglish = ((medication && medication.language) || language || '').toLowerCase() === 'english';
  const audioDir = path.join(__dirname, '../../public/audio');

  if (medication.instruction_source === 'recorded' && medication.audio_url) {
    if (medication.audio_url.startsWith('http://') || medication.audio_url.startsWith('https://')) {
      return medication.audio_url;
    }
    const { getCloudinaryAudioUrl } = require('./cloudinaryService');
    const baseName = path.basename(medication.audio_url)
      .replace(/^(merged_|converted_|relisten_)/, '')
      .replace(/\.(webm|mp3)$/, '');

    const relistenFile = `relisten_${baseName}.mp3`;
    if (fs.existsSync(path.join(audioDir, relistenFile))) {
      return `${baseUrl}/audio/${relistenFile}`;
    }
    return getCloudinaryAudioUrl(relistenFile, baseUrl);
  }

  let fileUrl = medication.audio_url || (isEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3');
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const { getCloudinaryAudioUrl } = require('./cloudinaryService');
  const cloudUrl = getCloudinaryAudioUrl(fileUrl, baseUrl);
  if (cloudUrl && cloudUrl.startsWith('https://res.cloudinary.com')) {
    return cloudUrl;
  }
  if (fileUrl.includes('localhost:3000')) {
    fileUrl = fileUrl.replace(/http:\/\/localhost:3000/g, baseUrl);
  } else {
    fileUrl = `${baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  }
  return fileUrl;
}

module.exports = {
  convertToMp3,
  concatAudioFiles,
  prepareRecordedMedicationAudio,
  getRelistenAudioUrl
};
