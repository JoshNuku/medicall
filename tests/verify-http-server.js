const http = require('http');
const app = require('../src/app');

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request({ ...options, port, host: '127.0.0.1' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testHttpEndpoints() {
  const server = app.listen(0);
  console.log('--- Testing Live Express Endpoints ---');

  try {
    // 1. Health check
    const health = await makeRequest(server, { path: '/health', method: 'GET' });
    console.log('✓ GET /health status:', health.status);
    const parsed = JSON.parse(health.body);
    if (parsed.status !== 'ok') throw new Error('Health check failed');

    // 2. Swagger docs
    const docs = await makeRequest(server, { path: '/api-docs/', method: 'GET' });
    console.log('✓ GET /api-docs/ status:', docs.status);
    if (docs.status !== 200) throw new Error('Swagger UI failed to load');

    // 3. POST /voice/reminder
    const reminder = await makeRequest(server, {
      path: '/voice/reminder?callEventId=1',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('✓ POST /voice/reminder status:', reminder.status);
    console.log('✓ Content-Type:', reminder.headers['content-type']);
    if (!reminder.body.includes('<Response>') || !reminder.body.includes('<GetDigits')) {
      throw new Error('Invalid voice XML response');
    }

    // 4. POST /voice/reminder/confirm with keypress 1
    const postBody = 'dtmfDigits=1';
    const confirm = await makeRequest(server, {
      path: '/voice/reminder/confirm?callEventId=1',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody)
      }
    }, postBody);
    console.log('✓ POST /voice/reminder/confirm status:', confirm.status);
    console.log('✓ Confirmation XML:', confirm.body.trim());

    console.log('\nAll HTTP endpoint checks passed successfully!');
  } finally {
    server.close();
  }
}

testHttpEndpoints().catch(err => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
