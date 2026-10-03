require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { synthesizeTwiSpeech } = require('../src/services/khayaService');

async function synthesizeEnglishSpeech(text, filename) {
  const backendAudioDir = path.join(__dirname, '../public/audio');
  const frontendAudioDir = path.join(__dirname, '../../frontend/public/audio');
  
  if (!fs.existsSync(backendAudioDir)) fs.mkdirSync(backendAudioDir, { recursive: true });
  if (!fs.existsSync(frontendAudioDir)) fs.mkdirSync(frontendAudioDir, { recursive: true });

  const backendPath = path.join(backendAudioDir, filename);
  const frontendPath = path.join(frontendAudioDir, filename);

  const sentences = text.match(/[^.?!]+[.?!]+|[^.?!]+$/g) || [text];
  const buffers = [];
  for (const s of sentences) {
    const q = s.trim();
    if (!q) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw-ob`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      buffers.push(Buffer.from(await res.arrayBuffer()));
    }
  }

  if (buffers.length > 0) {
    const combined = Buffer.concat(buffers);
    fs.writeFileSync(backendPath, combined);
    fs.writeFileSync(frontendPath, combined);
    console.log(`✓ Generated English audio: ${filename} (${combined.length} bytes)`);
    return true;
  }
  return false;
}

async function copyToFrontend(filename) {
  const backendPath = path.join(__dirname, '../public/audio', filename);
  const frontendPath = path.join(__dirname, '../../frontend/public/audio', filename);
  if (fs.existsSync(backendPath)) {
    fs.copyFileSync(backendPath, frontendPath);
    console.log(`✓ Synced to frontend/public/audio/${filename}`);
  }
}

async function main() {
  console.log('--- Generating Permanent Keypad Audio Assets with Khaya AI ---');

  // 1. Asante Twi Keypress Trailer (for UI preview & relisten)
  console.log('\n[1/4] Generating Twi Keypress Trailer via Khaya AI...');
  const twiTrailerText = 'Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.';
  const twiTrailerFile = 'twi_keypress_trailer.mp3';
  await synthesizeTwiSpeech(twiTrailerText, twiTrailerFile, 'female', 0.88);
  await copyToFrontend(twiTrailerFile);

  // 2. Asante Twi Keypress Full Menu (for Outbound Reminder Calls)
  console.log('\n[2/4] Generating Twi Keypress Full Menu via Khaya AI...');
  const twiMenuText = 'Sɛ woanom aduro no a, mia baako. Sɛ wonnom a, mia mmienu. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.';
  const twiMenuFile = 'twi_keypress_menu.mp3';
  await synthesizeTwiSpeech(twiMenuText, twiMenuFile, 'female', 0.88);
  await copyToFrontend(twiMenuFile);

  // 3. English Keypress Trailer
  console.log('\n[3/4] Generating English Keypress Trailer...');
  const enTrailerText = 'Press 9 to hear this instruction again, or press 0 to speak with your pharmacist.';
  await synthesizeEnglishSpeech(enTrailerText, 'en_keypress_trailer.mp3');

  // 4. English Keypress Full Menu
  console.log('\n[4/4] Generating English Keypress Full Menu...');
  const enMenuText = 'Press 1 to confirm you have taken your medication. Press 2 if not taken. Press 9 to repeat, or press 0 for your pharmacist.';
  await synthesizeEnglishSpeech(enMenuText, 'en_keypress_menu.mp3');

  console.log('\n✨ All permanent audio assets successfully generated and synced!');
}

main().catch(err => {
  console.error('Error generating audio assets:', err);
  process.exit(1);
});
