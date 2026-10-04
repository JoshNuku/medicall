require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');
const fs = require('fs');
const { transcribeAudio } = require('./src/services/sttService');

async function runTest() {
  console.log('==============================================');
  console.log('🎙️  TESTING GROQ WHISPER STT (SPEECH-TO-TEXT)');
  console.log('==============================================');

  // Allow custom file via CLI argument: `node test-stt.js path/to/my-audio.mp3`
  let targetAudio = process.argv[2];

  if (!targetAudio) {
    const audioDir = path.join(__dirname, 'public/audio');
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.webm'));
    
    if (files.length === 0) {
      console.error('❌ No audio files found in backend/public/audio/ to test with.');
      return;
    }
    targetAudio = path.join(audioDir, files[0]);
  }

  console.log(`📁 Audio file: ${targetAudio}`);
  console.log(`⏳ Sending to Groq Whisper API...`);

  const startTime = Date.now();
  try {
    const transcript = await transcribeAudio(targetAudio);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Transcription Success!');
    console.log(`⏱️  Time taken: ${duration} seconds`);
    console.log('----------------------------------------------');
    console.log(`📝 Transcript:\n"${transcript}"`);
    console.log('----------------------------------------------');
  } catch (error) {
    console.error('\n❌ Transcription Failed:', error.message);
  }
}

runTest();
