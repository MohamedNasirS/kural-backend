/**
 * Load Testing Script
 * Simulates concurrent user load on critical API endpoints
 */

import http from 'http';

const BASE_URL = 'http://localhost:4000';
let sessionCookie = null;

// Load Test Configuration
const CONFIG = {
  CONCURRENT_USERS: [5, 10, 25, 50, 100],
  REQUESTS_PER_USER: 10,
  THINK_TIME_MS: 100, // Time between requests
  TEST_DURATION_PER_LEVEL: 10000, // 10 seconds per concurrency level
};

// Results storage
const results = {
  tests: [],
  summary: {},
  latencyPercentiles: {},
  throughput: {},
  errors: [],
  breakpoint: null
};

// Helper function for HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
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

        resolve({
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
          size: data.length
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        duration: Date.now() - startTime,
        success: false,
        error: err.message
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        status: 0,
        duration: 30000,
        success: false,
        error: 'Timeout'
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Calculate percentiles
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Run a single endpoint test with specified concurrency
async function runEndpointTest(name, path, concurrency, duration) {
  console.log(`  Testing ${name} with ${concurrency} concurrent users...`);

  const startTime = Date.now();
  const latencies = [];
  const errors = [];
  let requestCount = 0;
  let successCount = 0;

  // Create virtual users
  const users = [];
  for (let i = 0; i < concurrency; i++) {
    users.push((async () => {
      while (Date.now() - startTime < duration) {
        const result = await makeRequest('GET', path);
        requestCount++;
        latencies.push(result.duration);

        if (result.success) {
          successCount++;
        } else {
          errors.push({
            status: result.status,
            error: result.error || `HTTP ${result.status}`
          });
        }

        // Think time
        await new Promise(r => setTimeout(r, CONFIG.THINK_TIME_MS));
      }
    })());
  }

  await Promise.all(users);
  const totalDuration = Date.now() - startTime;

  const testResult = {
    endpoint: name,
    path,
    concurrency,
    totalRequests: requestCount,
    successfulRequests: successCount,
    failedRequests: requestCount - successCount,
    errorRate: ((requestCount - successCount) / requestCount * 100).toFixed(2) + '%',
    throughput: (requestCount / (totalDuration / 1000)).toFixed(2) + ' req/s',
    throughputNum: requestCount / (totalDuration / 1000),
    latency: {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      avg: (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0),
      p50: percentile(latencies, 50),
      p75: percentile(latencies, 75),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99)
    },
    durationMs: totalDuration
  };

  console.log(`    Requests: ${requestCount}, Success: ${successCount}, Throughput: ${testResult.throughput}`);
  console.log(`    Latency P50: ${testResult.latency.p50}ms, P95: ${testResult.latency.p95}ms, P99: ${testResult.latency.p99}ms`);

  return testResult;
}

// Run load test for an endpoint across all concurrency levels
async function runScalabilityTest(name, path) {
  console.log(`\n--- Load Testing: ${name} ---`);

  const endpointResults = [];
  let breakpoint = null;

  for (const concurrency of CONFIG.CONCURRENT_USERS) {
    const result = await runEndpointTest(name, path, concurrency, CONFIG.TEST_DURATION_PER_LEVEL);
    endpointResults.push(result);

    // Check for breakpoint (error rate > 1% or p95 > 2000ms)
    const errorRateNum = parseFloat(result.errorRate);
    if (!breakpoint && (errorRateNum > 1 || result.latency.p95 > 2000)) {
      breakpoint = {
        concurrency,
        errorRate: result.errorRate,
        p95Latency: result.latency.p95
      };
    }
  }

  return {
    endpoint: name,
    path,
    results: endpointResults,
    breakpoint,
    maxThroughput: Math.max(...endpointResults.map(r => r.throughputNum)).toFixed(2) + ' req/s',
    maxConcurrencyStable: breakpoint ? breakpoint.concurrency - CONFIG.CONCURRENT_USERS[CONFIG.CONCURRENT_USERS.indexOf(breakpoint.concurrency) - 1] || CONFIG.CONCURRENT_USERS[0] : CONFIG.CONCURRENT_USERS[CONFIG.CONCURRENT_USERS.length - 1]
  };
}

// Main execution
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              KURAL BACKEND - LOAD TESTING                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nTest started at: ${new Date().toISOString()}`);
  console.log(`Configuration:`);
  console.log(`  - Concurrency levels: ${CONFIG.CONCURRENT_USERS.join(', ')}`);
  console.log(`  - Test duration per level: ${CONFIG.TEST_DURATION_PER_LEVEL / 1000}s`);
  console.log(`  - Think time: ${CONFIG.THINK_TIME_MS}ms\n`);

  try {
    // Authenticate first
    console.log('Authenticating...');
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin@kuralapp.com',
      password: 'admin123'
    });

    if (!loginResult.success) {
      console.error('Authentication failed. Cannot proceed with load tests.');
      return;
    }
    console.log('✓ Authenticated successfully\n');

    // Define critical endpoints to test
    const endpoints = [
      { name: 'Auth Session Check', path: '/api/auth/me' },
      { name: 'User List', path: '/api/rbac/users?limit=50' },
      { name: 'Booth List (AC 111)', path: '/api/rbac/booths?ac=111' },
      { name: 'Voter List (AC 111)', path: '/api/voters/111?limit=50' },
      { name: 'Dashboard Stats', path: '/api/rbac/dashboard/stats' },
      { name: 'AC Overview', path: '/api/rbac/dashboard/ac-overview' },
      { name: 'Survey List', path: '/api/surveys' },
      { name: 'Master Data Sections', path: '/api/master-data/sections' },
    ];

    // Run load tests
    for (const endpoint of endpoints) {
      const testResult = await runScalabilityTest(endpoint.name, endpoint.path);
      results.tests.push(testResult);
    }

    // Generate summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    LOAD TEST SUMMARY                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('Endpoint Performance Summary:');
    console.log('─'.repeat(90));
    console.log(`${'Endpoint'.padEnd(25)} | ${'Max Throughput'.padEnd(15)} | ${'Max Stable Concurrency'.padEnd(20)} | Breakpoint`);
    console.log('─'.repeat(90));

    results.tests.forEach(test => {
      const breakpointStr = test.breakpoint
        ? `C=${test.breakpoint.concurrency}, Error=${test.breakpoint.errorRate}`
        : 'None';
      console.log(`${test.endpoint.padEnd(25)} | ${test.maxThroughput.padEnd(15)} | ${String(test.maxConcurrencyStable).padEnd(20)} | ${breakpointStr}`);
    });

    console.log('─'.repeat(90));

    // Find overall system capacity
    const avgMaxThroughput = results.tests.reduce((sum, t) => sum + parseFloat(t.maxThroughput), 0) / results.tests.length;
    const minStableConcurrency = Math.min(...results.tests.map(t => t.maxConcurrencyStable));

    results.summary = {
      totalEndpointsTested: results.tests.length,
      avgMaxThroughput: avgMaxThroughput.toFixed(2) + ' req/s',
      minStableConcurrency,
      systemCapacity: {
        maxConcurrentUsers: minStableConcurrency,
        estimatedRPS: avgMaxThroughput.toFixed(0),
        notes: 'Based on lowest common denominator across all endpoints'
      }
    };

    console.log('\nSystem Capacity Estimate:');
    console.log(`  Max Concurrent Users: ${results.summary.systemCapacity.maxConcurrentUsers}`);
    console.log(`  Estimated RPS: ${results.summary.systemCapacity.estimatedRPS}`);

    // Calculate overall latency percentiles
    console.log('\nLatency Distribution (at max stable load):');
    results.tests.forEach(test => {
      const stableResult = test.results.find(r => r.concurrency === test.maxConcurrencyStable) || test.results[test.results.length - 1];
      console.log(`  ${test.endpoint}: P50=${stableResult.latency.p50}ms, P95=${stableResult.latency.p95}ms, P99=${stableResult.latency.p99}ms`);
    });

    // Output JSON results
    console.log('\n--- JSON Results ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Load test error:', error);
  }
}

main();
