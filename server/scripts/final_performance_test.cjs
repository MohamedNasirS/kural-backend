/**
 * Final Performance Test Suite v2
 * Tests optimized endpoints and generates comparison report
 */

const http = require('http');

// Test configuration
const RUNS_PER_ENDPOINT = 5;
const CONCURRENCY_LEVELS = [1, 5, 10];

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  endpoints: {}
};

// Baseline (from v1 report)
const BASELINE = {
  '/api/families/111': { p50: 10000, p95: 12000 },
  '/api/voters/fields/existing': { p50: 3700, p95: 4000 },
  '/api/rbac/dashboard/stats': { p50: 1400, p95: 2000 },
  '/api/rbac/dashboard/ac-overview': { p50: 1300, p95: 1500 }
};

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
          bodyLength: body.length,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    req.on('error', (e) => resolve({ error: e.message, duration: Date.now() - start, success: false }));
    req.setTimeout(60000);
    if (data) req.write(data);
    req.end();
  });
}

function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
  };
}

async function login() {
  const loginData = JSON.stringify({
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });

  const result = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);

  const sessionCookie = result.cookies.find(c => c.includes('kural.sid'));
  return sessionCookie ? sessionCookie.split(';')[0] : null;
}

async function testEndpoint(path, authHeaders, runs = RUNS_PER_ENDPOINT) {
  const times = [];
  const errors = [];

  for (let i = 0; i < runs; i++) {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET',
      headers: authHeaders
    });

    if (result.success) {
      times.push(result.duration);
    } else {
      errors.push(result.error || `Status: ${result.status}`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 100));
  }

  return { times, errors, stats: times.length > 0 ? calculateStats(times) : null };
}

async function testConcurrent(path, authHeaders, concurrency) {
  const start = Date.now();
  const promises = [];

  for (let i = 0; i < concurrency; i++) {
    promises.push(makeRequest({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET',
      headers: authHeaders
    }));
  }

  const results = await Promise.all(promises);
  const wallTime = Date.now() - start;
  const times = results.filter(r => r.success).map(r => r.duration);
  const errors = results.filter(r => !r.success).length;

  return {
    concurrency,
    wallTime,
    avgResponseTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    throughput: Math.round((concurrency / wallTime) * 1000 * 10) / 10,
    errors
  };
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BACKEND PERFORMANCE TEST SUITE v2                     ║');
  console.log('║         Post-Optimization Performance Analysis                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Test started at:', new Date().toISOString());
  console.log('');

  // Login
  console.log('🔐 Authenticating...');
  const cookie = await login();
  if (!cookie) {
    console.log('❌ Login failed. Aborting tests.');
    return;
  }
  console.log('✓ Login successful\n');

  const authHeaders = { 'Cookie': cookie };
  const endpoints = [
    { path: '/api/families/111?page=1&limit=50', name: 'Families (AC 111)' },
    { path: '/api/voters/fields/existing', name: 'Fields Existing' },
    { path: '/api/rbac/dashboard/stats', name: 'Dashboard Stats' },
    { path: '/api/rbac/dashboard/ac-overview', name: 'AC Overview' }
  ];

  // Sequential tests
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 1: SEQUENTIAL LATENCY TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    console.log(`Path: ${endpoint.path}`);

    const result = await testEndpoint(endpoint.path, authHeaders, RUNS_PER_ENDPOINT);
    results.endpoints[endpoint.path] = result;

    if (result.stats) {
      const baseline = BASELINE[endpoint.path.split('?')[0]] || BASELINE[endpoint.path];
      const improvement = baseline ? Math.round((1 - result.stats.p50 / baseline.p50) * 100) : null;

      console.log(`  Runs: ${result.times.length}/${RUNS_PER_ENDPOINT}`);
      console.log(`  Min: ${result.stats.min}ms | Avg: ${result.stats.avg}ms | Max: ${result.stats.max}ms`);
      console.log(`  P50: ${result.stats.p50}ms | P95: ${result.stats.p95}ms | P99: ${result.stats.p99}ms`);
      if (improvement !== null) {
        console.log(`  📈 Improvement vs Baseline: ${improvement}% faster`);
      }
    } else {
      console.log(`  ❌ All requests failed`);
    }

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
    console.log('');
  }

  // Concurrent tests
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 2: CONCURRENT LOAD TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const familiesPath = '/api/families/111?page=1&limit=50';
  console.log(`Testing: ${familiesPath}\n`);
  console.log('Concurrency | Wall Time | Avg Response | Throughput | Errors');
  console.log('------------|-----------|--------------|------------|-------');

  for (const concurrency of CONCURRENCY_LEVELS) {
    const result = await testConcurrent(familiesPath, authHeaders, concurrency);
    console.log(
      `${String(concurrency).padStart(11)} | ` +
      `${String(result.wallTime).padStart(7)}ms | ` +
      `${String(result.avgResponseTime || 'N/A').padStart(10)}ms | ` +
      `${String(result.throughput).padStart(8)} rps | ` +
      `${result.errors}`
    );
    await new Promise(r => setTimeout(r, 500));
  }

  // Cache effectiveness test
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('PHASE 3: CACHE EFFECTIVENESS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const endpoint of endpoints) {
    // First call (cold cache or miss)
    const cold = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: endpoint.path,
      method: 'GET',
      headers: authHeaders
    });

    // Immediate second call (warm cache)
    const warm = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: endpoint.path,
      method: 'GET',
      headers: authHeaders
    });

    const speedup = cold.success && warm.success
      ? Math.round((1 - warm.duration / cold.duration) * 100)
      : 'N/A';

    console.log(`${endpoint.name}:`);
    console.log(`  Cold: ${cold.duration}ms | Warm: ${warm.duration}ms | Speedup: ${speedup}%`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY: BEFORE vs AFTER OPTIMIZATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Endpoint                     | Before P50 | After P50 | Improvement');
  console.log('-----------------------------|------------|-----------|------------');

  for (const endpoint of endpoints) {
    const baselinePath = endpoint.path.split('?')[0];
    const baseline = BASELINE[baselinePath] || BASELINE[endpoint.path];
    const result = results.endpoints[endpoint.path];

    if (baseline && result && result.stats) {
      const improvement = Math.round((1 - result.stats.p50 / baseline.p50) * 100);
      console.log(
        `${endpoint.name.padEnd(28)} | ` +
        `${String(baseline.p50).padStart(8)}ms | ` +
        `${String(result.stats.p50).padStart(7)}ms | ` +
        `${String(improvement).padStart(9)}%`
      );
    }
  }

  console.log('\n✓ Performance tests completed at:', new Date().toISOString());

  // Output JSON for report generation
  console.log('\n=== JSON_DATA_START ===');
  console.log(JSON.stringify({
    timestamp: results.timestamp,
    baseline: BASELINE,
    results: Object.fromEntries(
      Object.entries(results.endpoints).map(([k, v]) => [k, v.stats])
    )
  }, null, 2));
  console.log('=== JSON_DATA_END ===');
}

runTests().catch(console.error);
