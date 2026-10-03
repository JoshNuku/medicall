require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');
const fs = require('fs');
const { transcribeAudio } = require('./src/services/sttService');
const { parseDictation } = require('./src/services/dictationParserService');

async function runTest() {
  console.log('======================================================');
  console.log('🤖 TESTING VOICE-TO-FORM AGENT PIPELINE');
  console.log('======================================================');

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
  console.log(`⏳ Step 1/2: Transcribing speech with Whisper...`);

  const t0 = Date.now();
  const transcript = await transcribeAudio(targetAudio);
  const t1 = Date.now();
  console.log(`✓ Transcribed in ${((t1 - t0) / 1000).toFixed(2)}s: "${transcript}"`);

  console.log(`\n⏳ Step 2/2: Extracting structured schema with openai/gpt-oss-20b...`);
  const structuredData = await parseDictation(transcript);
  const t2 = Date.now();
  console.log(`✓ Structured extraction in ${((t2 - t1) / 1000).toFixed(2)}s!`);
  console.log(`⏱️  Total Pipeline Time: ${((t2 - t0) / 1000).toFixed(2)}s`);

  console.log('\n======================================================');
  console.log('📦 STRUCTURED JSON RETURNED TO FRONTEND:');
  console.log('======================================================');
  console.log(JSON.stringify(structuredData, null, 2));
  console.log('======================================================\n');
}

runTest().catch(err => console.error('❌ Test failed:', err.message));
