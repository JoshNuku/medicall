/**
 * MediCall Production Pre-Flight Smoke Test
 *
 * Runs end-to-end diagnostic checks to verify that database, Cloudinary CDN,
 * AI triage agent, TTS synthesis, and telephony IVR webhook simulation are all operational.
 *
 * Usage:
 *   npm run test:prod
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { query } = require('../src/db/connection');
const cloudinaryMap = require('../src/config/cloudinaryAudioMap.json');

const PASS = '✓';
const FAIL = '✗';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${PASS} [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failedTests++;
    console.error(`  ${FAIL} [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function makeLocalRequest(path, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 3000;
    const bodyStr = postData ? JSON.stringify(postData) : null;
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Accept': 'application/json',
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        } : {})
      },
      timeout: 8000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runSmokeTests() {
  console.log('\n======================================================');
  console.log('   MEDICALL PRODUCTION PRE-FLIGHT SMOKE TEST');
  console.log('======================================================\n');

  // 1. Database Connectivity & Seed State
  console.log('[1/6] Testing Database Connectivity & Seed State...');
  try {
    const t0 = Date.now();
    const patientResult = await query('SELECT count(*) as count FROM patients');
    const latency = Date.now() - t0;
    const patientRows = patientResult.rows || patientResult;
    const count = parseInt(patientRows[0]?.count || 0, 10);
    assert(count > 0, 'Database query executed successfully', `${count} patients registered, ${latency}ms latency`);

    const templateResult = await query('SELECT count(*) as count FROM instruction_templates');
    const templateRows = templateResult.rows || templateResult;
    const templateCount = parseInt(templateRows[0]?.count || 0, 10);
    assert(templateCount >= 10, 'Instruction templates seeded', `${templateCount} Asante Twi templates available`);
  } catch (err) {
    assert(false, 'Database connectivity test', err.message);
  }

  // 2. Cloudinary CDN & Audio Asset Availability
  console.log('\n[2/6] Testing Cloudinary CDN & Remote Audio Assets...');
  const mapKeys = Object.keys(cloudinaryMap);
  assert(mapKeys.length >= 60, 'Cloudinary audio map loaded', `${mapKeys.length} mapped assets found`);

  const sampleTrailer = cloudinaryMap['twi_keypress_trailer.mp3'] || cloudinaryMap['trailers/twi_keypress_trailer.mp3'];
  const sampleConfirm = cloudinaryMap['twi_confirmed.mp3'] || cloudinaryMap['confirmations/twi_confirmed.mp3'];

  if (sampleTrailer) {
    const trailerOk = await checkUrl(sampleTrailer);
    assert(trailerOk, 'Twi keypress trailer accessible on Cloudinary CDN', sampleTrailer.substring(0, 55) + '...');
  } else {
    assert(false, 'Twi keypress trailer mapped in Cloudinary');
  }

  if (sampleConfirm) {
    const confirmOk = await checkUrl(sampleConfirm);
    assert(confirmOk, 'Twi confirmation audio accessible on Cloudinary CDN', sampleConfirm.substring(0, 55) + '...');
  } else {
    assert(false, 'Twi confirmation audio mapped in Cloudinary');
  }

  // 3. Telephony & Third-Party Credentials Configuration
  console.log('\n[3/6] Testing Telephony & External Credentials...');
  assert(!!process.env.AT_API_KEY, "Africa's Talking API Key configured");
  assert(!!process.env.AT_VOICE_PHONE_NUMBER, "Africa's Talking Voice Phone configured", process.env.AT_VOICE_PHONE_NUMBER);
  assert(!!process.env.GROQ_API_KEY, 'Groq AI Agent API Key configured');
  assert(process.env.ENABLE_AI_AGENT === 'true', 'AI Clinical Escalation Agent enabled');

  // 4. Backend Health Endpoint Verification
  console.log('\n[4/6] Testing Live Backend /health Endpoint...');
  try {
    const healthRes = await makeLocalRequest('/health');
    assert(healthRes.status === 200, 'Health endpoint HTTP 200', `Status: ${healthRes.body?.status}`);
    const dbType = healthRes.body?.services?.database?.type;
    assert(!!dbType, 'Database diagnostic reported', `Engine: ${dbType}`);
    const isCloudinaryActive = healthRes.body?.services?.cloudinary?.status === 'connected';
    assert(isCloudinaryActive, 'Cloudinary diagnostic active', `${healthRes.body?.services?.cloudinary?.preUploadedAssetsCount} assets ready`);
    const ttsProvider = healthRes.body?.services?.ttsEngine?.activeProvider;
    assert(!!ttsProvider, 'TTS Provider configured', `Active: ${ttsProvider}`);
  } catch (err) {
    assert(false, 'Health endpoint request', err.message);
  }

  // 5. IVR Telephony Simulation (Reminder Call Flow)
  console.log('\n[5/6] Testing IVR Telephony Simulator (Outbound Call Prompt)...');
  try {
    const simRes = await makeLocalRequest('/voice/simulate', 'POST', {
      scenario: 'outbound_reminder_prompt',
      patient_id: 1
    });
    assert(simRes.status === 200, 'IVR simulator returned HTTP 200');
    assert(typeof simRes.body?.xml === 'string' && simRes.body?.xml.includes('<Response>'), 'Valid Africa\'s Talking XML returned');
    assert(simRes.body?.xml.includes('<GetDigits'), 'Contains GetDigits DTMF prompt');
  } catch (err) {
    assert(false, 'IVR simulator request', err.message);
  }

  // 6. IVR Keypress Dose Confirmation Simulation
  console.log('\n[6/6] Testing IVR DTMF Keypress Dose Confirmation Flow...');
  try {
    const dtmfRes = await makeLocalRequest('/voice/simulate', 'POST', {
      scenario: 'dtmf_keypress',
      patient_id: 1,
      dtmf_digits: '1'
    });
    assert(dtmfRes.status === 200, 'DTMF simulation returned HTTP 200');
    assert(dtmfRes.body?.actionTaken?.includes('Confirmed'), 'Dose successfully marked confirmed', dtmfRes.body?.actionTaken);
    const xml = dtmfRes.body?.xml || '';
    assert(xml.includes('cloudinary.com') || xml.includes('http'), 'Audio confirmation routed via CDN');
  } catch (err) {
    assert(false, 'DTMF simulation request', err.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`   TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    console.error(`Production readiness check FAILED with ${failedTests} error(s).\n`);
    process.exit(1);
  } else {
    console.log('All production pre-flight checks PASSED successfully! System is production-ready for Render deployment.\n');
    process.exit(0);
  }
}

runSmokeTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
