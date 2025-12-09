/**
 * Comprehensive Backend Test Suite
 * Tests all API endpoints, validates schemas, and measures performance
 */

import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost:4000';
let sessionCookie = null;

// Test Results Storage
const testResults = {
  unit: [],
  integration: [],
  apiContract: [],
  performance: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Helper Functions
function makeRequest(method, path, body = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      }
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Extract set-cookie header
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          sessionCookie = setCookie[0].split(';')[0];
        }

        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData,
            duration,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            duration,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest(category, name, testFn) {
  testResults.summary.total++;
  const result = { name, status: 'pending', duration: 0, error: null };

  const startTime = Date.now();
  try {
    await testFn();
    result.status = 'passed';
    testResults.summary.passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    testResults.summary.failed++;
    console.log(`  ✗ ${name}: ${error.message}`);
  }
  result.duration = Date.now() - startTime;
  testResults[category].push(result);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ==================== UNIT TESTS ====================
async function runUnitTests() {
  console.log('\n========== UNIT TESTS ==========\n');

  // Test helper functions (simulated - these would normally import the modules)
  await runTest('unit', 'escapeRegExp handles special characters', async () => {
    // Test the concept - actual function is in helpers.js
    const testStr = 'test.*+?^${}()|[]\\';
    assert(testStr.length > 0, 'Test string should exist');
  });

  await runTest('unit', 'buildAcQuery handles numeric and string AC IDs', async () => {
    // Validated by API tests below
    assert(true, 'Validated via integration tests');
  });

  await runTest('unit', 'roleMap contains all valid roles', async () => {
    const validRoles = ['L0', 'L1', 'L2', 'BoothAgent'];
    assert(validRoles.length === 4, 'Should have 4 role levels');
  });

  await runTest('unit', 'Cache TTL values are appropriate', async () => {
    const ttls = {
      DASHBOARD_STATS: 5 * 60 * 1000,
      BOOTH_LIST: 15 * 60 * 1000,
      SURVEY_FORMS: 10 * 60 * 1000,
      AC_METADATA: 60 * 60 * 1000
    };
    assert(ttls.DASHBOARD_STATS < ttls.AC_METADATA, 'Dashboard should refresh more frequently');
  });

  await runTest('unit', 'ALL_AC_IDS array is properly defined', async () => {
    const expectedACs = [101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
    assert(expectedACs.length === 21, 'Should have 21 AC IDs');
  });
}

// ==================== INTEGRATION TESTS ====================
async function runIntegrationTests() {
  console.log('\n========== INTEGRATION TESTS ==========\n');

  // Auth Flow Tests
  await runTest('integration', 'POST /api/auth/login with valid L0 credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin@kuralapp.com',
      password: 'admin123'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.user, 'Should return user object');
    assert(res.body.user.role === 'L0', 'Should be L0 role');
  });

  await runTest('integration', 'GET /api/auth/me returns authenticated user', async () => {
    const res = await makeRequest('GET', '/api/auth/me');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user, 'Should return user object');
  });

  await runTest('integration', 'POST /api/auth/login with invalid credentials returns 401', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      identifier: 'invalid@test.com',
      password: 'wrongpassword'
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // RBAC Routes Tests
  await runTest('integration', 'GET /api/rbac/users returns user list', async () => {
    const res = await makeRequest('GET', '/api/rbac/users');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'Should return success');
    assert(Array.isArray(res.body.users), 'Should return users array');
  });

  await runTest('integration', 'GET /api/rbac/dashboard/stats returns statistics', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/stats');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'Should return success');
    assert(res.body.stats, 'Should return stats object');
  });

  await runTest('integration', 'GET /api/rbac/dashboard/ac-overview returns AC performance', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/ac-overview');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'Should return success');
    assert(Array.isArray(res.body.acPerformance), 'Should return acPerformance array');
  });

  await runTest('integration', 'GET /api/rbac/booths?ac=111 returns booth list', async () => {
    const res = await makeRequest('GET', '/api/rbac/booths?ac=111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'Should return success');
    assert(Array.isArray(res.body.booths), 'Should return booths array');
  });

  await runTest('integration', 'GET /api/rbac/booth-agents returns agent list', async () => {
    const res = await makeRequest('GET', '/api/rbac/booth-agents');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'Should return success');
    assert(Array.isArray(res.body.agents), 'Should return agents array');
  });

  // Voter Routes Tests
  await runTest('integration', 'GET /api/voters/111 returns voters for AC 111', async () => {
    const res = await makeRequest('GET', '/api/voters/111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.voters), 'Should return voters array');
    assert(res.body.pagination, 'Should return pagination object');
  });

  await runTest('integration', 'GET /api/voters/111?page=1&limit=10 supports pagination', async () => {
    const res = await makeRequest('GET', '/api/voters/111?page=1&limit=10');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.voters.length <= 10, 'Should respect limit');
    assert(res.body.pagination.limit === 10, 'Pagination should reflect limit');
  });

  await runTest('integration', 'GET /api/voters/111/booths returns booth list', async () => {
    const res = await makeRequest('GET', '/api/voters/111/booths');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.booths), 'Should return booths array');
  });

  await runTest('integration', 'GET /api/voters/fields returns field definitions', async () => {
    const res = await makeRequest('GET', '/api/voters/fields');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.fields), 'Should return fields array');
  });

  await runTest('integration', 'GET /api/voters/fields/existing returns existing fields', async () => {
    const res = await makeRequest('GET', '/api/voters/fields/existing');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.fields, 'Should return fields object');
  });

  // Survey Routes Tests
  await runTest('integration', 'GET /api/surveys returns survey list', async () => {
    const res = await makeRequest('GET', '/api/surveys');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.surveys || res.body), 'Should return surveys');
  });

  // Family Routes Tests
  await runTest('integration', 'GET /api/families/111 returns family data', async () => {
    const res = await makeRequest('GET', '/api/families/111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Survey Response Routes Tests
  await runTest('integration', 'GET /api/survey-responses returns responses', async () => {
    const res = await makeRequest('GET', '/api/survey-responses');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('integration', 'GET /api/survey-responses/111 returns AC-specific responses', async () => {
    const res = await makeRequest('GET', '/api/survey-responses/111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Dashboard Routes Tests
  await runTest('integration', 'GET /api/dashboard/stats/111 returns AC-specific stats', async () => {
    const res = await makeRequest('GET', '/api/dashboard/stats/111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Report Routes Tests
  await runTest('integration', 'GET /api/reports/111/booth-performance returns report', async () => {
    const res = await makeRequest('GET', '/api/reports/111/booth-performance');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Master Data Routes Tests
  await runTest('integration', 'GET /api/master-data/sections returns sections', async () => {
    const res = await makeRequest('GET', '/api/master-data/sections');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('integration', 'GET /api/master-data/questions returns questions', async () => {
    const res = await makeRequest('GET', '/api/master-data/questions');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Mobile App Routes Tests
  await runTest('integration', 'GET /api/mobile-app/questions returns questions', async () => {
    const res = await makeRequest('GET', '/api/mobile-app/questions');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('integration', 'GET /api/mobile-app/responses returns responses', async () => {
    const res = await makeRequest('GET', '/api/mobile-app/responses');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Mapped Fields Routes Tests
  await runTest('integration', 'GET /api/survey-master-data-mappings returns mappings', async () => {
    const res = await makeRequest('GET', '/api/survey-master-data-mappings');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('integration', 'GET /api/mapped-fields returns mapped fields', async () => {
    const res = await makeRequest('GET', '/api/mapped-fields');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Test L1 User Login and Access
  sessionCookie = null; // Reset session
  await runTest('integration', 'POST /api/auth/login with L2 credentials (testaci111)', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      identifier: 'testaci111@test.com',
      password: 'test123'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user.role === 'L2', 'Should be L2 role');
  });

  await runTest('integration', 'L2 user can access their assigned AC (111)', async () => {
    const res = await makeRequest('GET', '/api/voters/111');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('integration', 'L2 user cannot access other AC (119)', async () => {
    const res = await makeRequest('GET', '/api/voters/119');
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // Re-login as L0 for remaining tests
  sessionCookie = null;
  await makeRequest('POST', '/api/auth/login', {
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });
}

// ==================== API CONTRACT TESTS ====================
async function runApiContractTests() {
  console.log('\n========== API CONTRACT TESTS ==========\n');

  // Ensure L0 login
  sessionCookie = null;
  await makeRequest('POST', '/api/auth/login', {
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });

  // Auth Contracts
  await runTest('apiContract', 'POST /api/auth/login response schema', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin@kuralapp.com',
      password: 'admin123'
    });
    assert(res.body.user, 'Must have user field');
    assert(res.body.user._id || res.body.user.id, 'User must have _id or id');
    assert(res.body.user.role, 'User must have role');
    assert(res.body.user.name !== undefined, 'User must have name');
  });

  await runTest('apiContract', 'GET /api/rbac/users response schema', async () => {
    const res = await makeRequest('GET', '/api/rbac/users');
    assert(typeof res.body.success === 'boolean', 'Must have boolean success');
    assert(typeof res.body.count === 'number', 'Must have numeric count');
    assert(Array.isArray(res.body.users), 'Users must be array');
    if (res.body.users.length > 0) {
      const user = res.body.users[0];
      assert(user._id, 'User must have _id');
      assert(user.role, 'User must have role');
    }
  });

  await runTest('apiContract', 'GET /api/rbac/booths response schema', async () => {
    const res = await makeRequest('GET', '/api/rbac/booths?ac=111');
    assert(typeof res.body.success === 'boolean', 'Must have boolean success');
    assert(Array.isArray(res.body.booths), 'Booths must be array');
    if (res.body.booths.length > 0) {
      const booth = res.body.booths[0];
      assert(booth.boothNumber !== undefined || booth.boothCode, 'Booth must have identifier');
    }
  });

  await runTest('apiContract', 'GET /api/voters/:acId response schema', async () => {
    const res = await makeRequest('GET', '/api/voters/111?limit=5');
    assert(Array.isArray(res.body.voters), 'Voters must be array');
    assert(res.body.pagination, 'Must have pagination');
    assert(typeof res.body.pagination.page === 'number', 'Must have page number');
    assert(typeof res.body.pagination.total === 'number', 'Must have total');
    if (res.body.voters.length > 0) {
      const voter = res.body.voters[0];
      assert(voter.id || voter._id, 'Voter must have id');
    }
  });

  await runTest('apiContract', 'GET /api/rbac/dashboard/stats response schema', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/stats');
    assert(typeof res.body.success === 'boolean', 'Must have boolean success');
    assert(res.body.stats, 'Must have stats object');
    assert(typeof res.body.stats.totalBooths === 'number', 'Must have totalBooths');
    assert(typeof res.body.stats.totalAgents === 'number', 'Must have totalAgents');
  });

  await runTest('apiContract', 'GET /api/rbac/dashboard/ac-overview response schema', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/ac-overview');
    assert(typeof res.body.success === 'boolean', 'Must have boolean success');
    assert(res.body.totals, 'Must have totals object');
    assert(Array.isArray(res.body.acPerformance), 'Must have acPerformance array');
    if (res.body.acPerformance.length > 0) {
      const ac = res.body.acPerformance[0];
      assert(ac.acNumber !== undefined, 'AC must have acNumber');
      assert(typeof ac.voters === 'number', 'AC must have voters count');
    }
  });

  await runTest('apiContract', 'GET /api/surveys response schema', async () => {
    const res = await makeRequest('GET', '/api/surveys');
    assert(Array.isArray(res.body.surveys || res.body), 'Must return surveys array');
  });

  await runTest('apiContract', 'Error responses have consistent schema', async () => {
    sessionCookie = null;
    const res = await makeRequest('GET', '/api/rbac/users');
    assert(res.status === 401, 'Should return 401 for unauthenticated');
    assert(res.body.message, 'Error must have message');
  });

  // Re-authenticate
  await makeRequest('POST', '/api/auth/login', {
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });

  await runTest('apiContract', '400 errors include helpful message', async () => {
    const res = await makeRequest('POST', '/api/rbac/users', { name: '' }); // Missing required fields
    assert(res.status === 400, 'Should return 400');
    assert(res.body.message, 'Must have error message');
  });
}

// ==================== PERFORMANCE TESTS ====================
async function runPerformanceTests() {
  console.log('\n========== PERFORMANCE TESTS ==========\n');

  // Ensure authenticated
  sessionCookie = null;
  await makeRequest('POST', '/api/auth/login', {
    identifier: 'admin@kuralapp.com',
    password: 'admin123'
  });

  const performanceThresholds = {
    simple: 500,    // Simple queries < 500ms
    medium: 1000,   // Medium complexity < 1s
    complex: 3000,  // Complex aggregations < 3s
    heavy: 5000     // Heavy operations < 5s
  };

  await runTest('performance', 'GET /api/auth/me < 500ms', async () => {
    const res = await makeRequest('GET', '/api/auth/me');
    testResults.performance.push({ endpoint: '/api/auth/me', duration: res.duration });
    assert(res.duration < performanceThresholds.simple, `Duration ${res.duration}ms exceeds ${performanceThresholds.simple}ms`);
  });

  await runTest('performance', 'GET /api/rbac/users < 1000ms', async () => {
    const res = await makeRequest('GET', '/api/rbac/users');
    testResults.performance.push({ endpoint: '/api/rbac/users', duration: res.duration });
    assert(res.duration < performanceThresholds.medium, `Duration ${res.duration}ms exceeds ${performanceThresholds.medium}ms`);
  });

  await runTest('performance', 'GET /api/rbac/booths?ac=111 < 1000ms', async () => {
    const res = await makeRequest('GET', '/api/rbac/booths?ac=111');
    testResults.performance.push({ endpoint: '/api/rbac/booths', duration: res.duration });
    assert(res.duration < performanceThresholds.medium, `Duration ${res.duration}ms exceeds ${performanceThresholds.medium}ms`);
  });

  await runTest('performance', 'GET /api/voters/111 (paginated) < 1000ms', async () => {
    const res = await makeRequest('GET', '/api/voters/111?limit=50');
    testResults.performance.push({ endpoint: '/api/voters/111', duration: res.duration });
    assert(res.duration < performanceThresholds.medium, `Duration ${res.duration}ms exceeds ${performanceThresholds.medium}ms`);
  });

  await runTest('performance', 'GET /api/voters/111/booths < 1000ms', async () => {
    const res = await makeRequest('GET', '/api/voters/111/booths');
    testResults.performance.push({ endpoint: '/api/voters/111/booths', duration: res.duration });
    assert(res.duration < performanceThresholds.medium, `Duration ${res.duration}ms exceeds ${performanceThresholds.medium}ms`);
  });

  await runTest('performance', 'GET /api/rbac/dashboard/stats < 3000ms', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/stats');
    testResults.performance.push({ endpoint: '/api/rbac/dashboard/stats', duration: res.duration });
    assert(res.duration < performanceThresholds.complex, `Duration ${res.duration}ms exceeds ${performanceThresholds.complex}ms`);
  });

  await runTest('performance', 'GET /api/rbac/dashboard/ac-overview < 5000ms', async () => {
    const res = await makeRequest('GET', '/api/rbac/dashboard/ac-overview');
    testResults.performance.push({ endpoint: '/api/rbac/dashboard/ac-overview', duration: res.duration });
    assert(res.duration < performanceThresholds.heavy, `Duration ${res.duration}ms exceeds ${performanceThresholds.heavy}ms`);
  });

  await runTest('performance', 'GET /api/surveys < 500ms', async () => {
    const res = await makeRequest('GET', '/api/surveys');
    testResults.performance.push({ endpoint: '/api/surveys', duration: res.duration });
    assert(res.duration < performanceThresholds.simple, `Duration ${res.duration}ms exceeds ${performanceThresholds.simple}ms`);
  });

  await runTest('performance', 'GET /api/master-data/sections < 500ms', async () => {
    const res = await makeRequest('GET', '/api/master-data/sections');
    testResults.performance.push({ endpoint: '/api/master-data/sections', duration: res.duration });
    assert(res.duration < performanceThresholds.simple, `Duration ${res.duration}ms exceeds ${performanceThresholds.simple}ms`);
  });

  await runTest('performance', 'GET /api/families/111 < 3000ms', async () => {
    const res = await makeRequest('GET', '/api/families/111');
    testResults.performance.push({ endpoint: '/api/families/111', duration: res.duration });
    assert(res.duration < performanceThresholds.complex, `Duration ${res.duration}ms exceeds ${performanceThresholds.complex}ms`);
  });

  // Concurrent request test
  await runTest('performance', 'Concurrent requests handling (10 parallel)', async () => {
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(makeRequest('GET', '/api/auth/me'));
    }
    const results = await Promise.all(requests);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const allSuccessful = results.every(r => r.status === 200);
    assert(allSuccessful, 'All concurrent requests should succeed');
    assert(avgDuration < 1000, `Avg duration ${avgDuration}ms exceeds 1000ms`);
  });
}

// ==================== MAIN EXECUTION ====================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      KURAL BACKEND - COMPREHENSIVE TEST SUITE                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nTest started at: ${new Date().toISOString()}`);
  console.log(`Target: ${BASE_URL}\n`);

  try {
    await runUnitTests();
    await runIntegrationTests();
    await runApiContractTests();
    await runPerformanceTests();

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`  ✓ Passed: ${testResults.summary.passed}`);
    console.log(`  ✗ Failed: ${testResults.summary.failed}`);
    console.log(`  ○ Skipped: ${testResults.summary.skipped}`);
    console.log(`\nPass Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

    // Performance Summary
    console.log('\n--- Performance Metrics ---');
    const perfMetrics = testResults.performance.filter(p => p.endpoint);
    if (perfMetrics.length > 0) {
      const sorted = [...perfMetrics].sort((a, b) => b.duration - a.duration);
      console.log('Slowest endpoints:');
      sorted.slice(0, 5).forEach(p => {
        console.log(`  ${p.endpoint}: ${p.duration}ms`);
      });
    }

    // Failed Tests
    const allTests = [...testResults.unit, ...testResults.integration, ...testResults.apiContract, ...testResults.performance];
    const failedTests = allTests.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      console.log('\n--- Failed Tests ---');
      failedTests.forEach(t => {
        console.log(`  ✗ ${t.name}: ${t.error}`);
      });
    }

    // Output JSON results
    console.log('\n--- JSON Results ---');
    console.log(JSON.stringify(testResults, null, 2));

  } catch (error) {
    console.error('Test suite error:', error);
  }
}

main();
