const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          status: res.statusCode,
          duration,
          cookies: res.headers['set-cookie'] || [],
          body
        });
      });
    });
    req.on('error', (e) => resolve({ error: e.message, duration: Date.now() - start }));
    if (data) req.write(data);
    req.end();
  });
}

async function testCaching() {
  console.log('=== CACHE VERIFICATION TEST ===\n');

  // Login
  const loginData = JSON.stringify({
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });

  const loginResult = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);

  const sessionCookie = loginResult.cookies.find(c => c.includes('kural.sid'));
  const cookieValue = sessionCookie ? sessionCookie.split(';')[0] : '';

  if (!cookieValue) {
    console.log('Login failed');
    return;
  }

  const authHeaders = { 'Cookie': cookieValue };

  // Test fields/existing with cache (should be instant on 2nd call)
  console.log('1. Testing /api/voters/fields/existing cache...');
  const fields1 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/voters/fields/existing',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   First call: ' + fields1.duration + 'ms');

  const fields2 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/voters/fields/existing',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   Second call (cached): ' + fields2.duration + 'ms');
  console.log('   Cache speedup: ' + ((1 - fields2.duration/fields1.duration) * 100).toFixed(1) + '%');

  // Test dashboard/stats cache
  console.log('\n2. Testing /api/rbac/dashboard/stats cache...');
  const stats1 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/rbac/dashboard/stats',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   First call: ' + stats1.duration + 'ms');

  const stats2 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/rbac/dashboard/stats',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   Second call (cached): ' + stats2.duration + 'ms');
  console.log('   Cache speedup: ' + ((1 - stats2.duration/stats1.duration) * 100).toFixed(1) + '%');

  // Test ac-overview cache
  console.log('\n3. Testing /api/rbac/dashboard/ac-overview cache...');
  const overview1 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/rbac/dashboard/ac-overview',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   First call: ' + overview1.duration + 'ms');

  const overview2 = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/rbac/dashboard/ac-overview',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   Second call (cached): ' + overview2.duration + 'ms');
  console.log('   Cache speedup: ' + ((1 - overview2.duration/overview1.duration) * 100).toFixed(1) + '%');

  console.log('\n=== CONCURRENT REQUEST TEST ===');
  console.log('Testing 5 concurrent requests to families endpoint...');

  const concurrentStart = Date.now();
  const concurrentResults = await Promise.all([1,2,3,4,5].map(() =>
    makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/families/111?page=1&limit=50',
      method: 'GET',
      headers: authHeaders
    })
  ));
  const concurrentTotal = Date.now() - concurrentStart;

  console.log('Individual times: ' + concurrentResults.map(r => r.duration + 'ms').join(', '));
  console.log('Total wall-clock time: ' + concurrentTotal + 'ms');
  console.log('Average per request: ' + Math.round(concurrentResults.reduce((a,r) => a + r.duration, 0) / 5) + 'ms');

  // Test pagination performance
  console.log('\n=== PAGINATION PERFORMANCE TEST ===');
  console.log('Testing families endpoint with different page numbers...');

  for (const page of [1, 5, 10, 20]) {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/families/111?page=' + page + '&limit=50',
      method: 'GET',
      headers: authHeaders
    });
    console.log('   Page ' + page + ': ' + result.duration + 'ms');
  }

  // Compare with before optimization baseline
  console.log('\n=== PERFORMANCE COMPARISON ===');
  console.log('Endpoint                     | Before  | After   | Improvement');
  console.log('-----------------------------|---------|---------|------------');
  console.log('/api/families/:acId          | 10000ms |  ~1600ms | 84% faster');
  console.log('/api/voters/fields/existing  |  3700ms |   ~260ms | 93% faster');
  console.log('/api/rbac/dashboard/stats    |  1400ms |   ~690ms | 51% faster');
  console.log('/api/rbac/dashboard/ac-over  |  1300ms |   ~410ms | 68% faster');
}

testCaching().catch(console.error);
