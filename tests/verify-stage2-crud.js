const http = require('http');
const app = require('../src/app');

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request({ ...options, port, host: '127.0.0.1' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, data: json, raw: data });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testStage2() {
  const server = app.listen(0);
  console.log('--- Testing Stage 2 Frontend CRUD Endpoints ---');

  try {
    // 1. GET /instruction-templates?category=dosage
    const tRes = await makeRequest(server, { path: '/instruction-templates?category=dosage', method: 'GET' });
    console.log('✓ GET /instruction-templates?category=dosage count:', tRes.data.templates.length);
    if (tRes.data.templates.length !== 8) throw new Error('Expected 8 dosage templates');

    // 2. POST /patients
    const pPayload = {
      phone_number: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
      name: 'Ama Serwaa',
      preferred_language: 'twi',
      caregiver_phone: '+233555555555'
    };
    const pRes = await makeRequest(server, {
      path: '/patients',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, pPayload);
    console.log('✓ POST /patients created ID:', pRes.data.patient.id);
    const patientId = pRes.data.patient.id;

    // 3. GET /patients
    const pList = await makeRequest(server, { path: '/patients', method: 'GET' });
    console.log('✓ GET /patients total count:', pList.data.patients.length);

    // 4. GET /patients/:id
    const pGet = await makeRequest(server, { path: `/patients/${patientId}`, method: 'GET' });
    console.log('✓ GET /patients/:id name:', pGet.data.patient.name);

    // 5. POST /patients/:id/medications (Template Mode)
    const mPayload = {
      drug_name: 'Metformin 500mg',
      instruction_source: 'template',
      dosage_template_id: 1,
      frequency_template_id: 10,
      timing_template_id: 15,
      schedule_times: '08:00,20:00',
      duration_days: 30,
      is_chronic: true
    };
    const mRes = await makeRequest(server, {
      path: `/patients/${patientId}/medications`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, mPayload);
    console.log('✓ POST /patients/:id/medications created ID:', mRes.data.medication.id);
    console.log('✓ Medication audio URL:', mRes.data.medication.audio_url);

    // 6. GET /patients/:id/medications
    const mList = await makeRequest(server, { path: `/patients/${patientId}/medications`, method: 'GET' });
    console.log('✓ GET /patients/:id/medications count:', mList.data.medications.length);

    // 7. GET /patients/:id/logs
    const lRes = await makeRequest(server, { path: `/patients/${patientId}/logs`, method: 'GET' });
    console.log('✓ GET /patients/:id/logs count:', lRes.data.logs.length);

    // 8. GET /alerts
    const aRes = await makeRequest(server, { path: '/alerts', method: 'GET' });
    console.log('✓ GET /alerts count:', aRes.data.alerts.length);

    // 9. POST /alerts/:id/resolve
    if (aRes.data.alerts.length > 0) {
      const alertId = aRes.data.alerts[0].id;
      const rRes = await makeRequest(server, {
        path: `/alerts/${alertId}/resolve`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { resolved_by: 'Nurse Mensah' });
      console.log('✓ POST /alerts/:id/resolve status:', rRes.data.escalation.status);
    }

    console.log('\nAll Stage 2 CRUD endpoints passed successfully!');
  } finally {
    server.close();
  }
}

testStage2().catch(err => {
  console.error('Stage 2 Test Error:', err);
  process.exit(1);
});
