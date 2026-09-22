const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

function generateSpeechFile(filename, text) {
  const wavPath = path.join(audioDir, `${filename}.wav`);
  const mp3Path = path.join(audioDir, `${filename}.mp3`);
  const psPath = path.join(__dirname, `temp_${filename}.ps1`);

  const scriptContent = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('${wavPath.replace(/\\/g, '\\\\')}')
$synth.Speak('${text.replace(/'/g, "''")}')
$synth.Dispose()
`;

  fs.writeFileSync(psPath, scriptContent, 'utf8');
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(psPath)) fs.unlinkSync(psPath);
  }

  return new Promise((resolve, reject) => {
    ffmpeg(wavPath)
      .toFormat('mp3')
      .save(mp3Path)
      .on('end', () => {
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        console.log(`Generated: ${mp3Path}`);
        resolve(mp3Path);
      })
      .on('error', (err) => {
        console.error(`FFmpeg error on ${filename}:`, err.message);
        // keep wav as fallback if mp3 fails
        resolve(wavPath);
      });
  });
}

async function main() {
  await generateSpeechFile(
    'default-reminder-en',
    'Hello, this is your MediCall medication adherence reminder. Please take your prescribed dose now as directed. Press 1 on your keypad to confirm you have taken it. Press 2 for side effects.'
  );

  await generateSpeechFile(
    'lisinopril_en',
    'Hello, this is your MediCall reminder for Lisinopril 10 milligrams. Take 1 tablet once daily before meals. Press 1 to confirm, or press 2 for side effects.'
  );

  await generateSpeechFile(
    'metformin_en',
    'Hello, this is your MediCall reminder for Metformin 850 milligrams. Take 1 tablet twice daily after meals. Press 1 to confirm you have taken your dose.'
  );

  console.log('All English audio files generated successfully!');
}

main().catch(console.error);
