/**
 * BrainBoard Live E2E Challenger 1 Adversarial Test Harness
 * File: tests/challenger_live_adversarial_harness.ts
 *
 * Empirical adversarial stress harness for the live BrainBoard backend on http://localhost:3000:
 * 1. Boundary Payloads & Type Tampering (Whitespace, nulls, invalid types, 75KB payloads, 120KB body limit 413, SQLi, XSS, Unicode, Null Byte handling)
 * 2. Rapid Requests & High-Concurrency Burst (50 concurrent calls, concurrent updates, connection pool resilience)
 * 3. Invalid Enum Inputs Across All Domain Entities (ProjectStatus, StageStatus, Status)
 * 4. Non-Existent UUIDs & Malformed IDs (404/400 validation, foreign key cascade constraints)
 * 5. Cascading Deletions & Hierarchy Integrity (Multi-level tree verification & zero-orphan validation)
 * 6. Live MCP SSE Wire Protocol Stress (Unknown tools, missing args, session isolation, concurrent tool calls)
 *
 * Zero external dependencies: Uses pure Node.js (http, url, crypto).
 */

import * as http from 'http';
import * as crypto from 'crypto';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

interface TestResult {
  id: string;
  name: string;
  category: 'BOUNDARY' | 'RAPID_CONCURRENCY' | 'INVALID_ENUMS' | 'NON_EXISTENT_UUIDS' | 'CASCADING_DELETIONS' | 'MCP_SSE';
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Low-level HTTP Helper
interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  rawBody: string;
  json: any;
}

function httpRequest(
  method: string,
  urlPath: string,
  body?: any,
  customHeaders?: Record<string, string>
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlPath, backendUrl);
    let payload = '';
    const headers: Record<string, string> = { ...customHeaders };

    if (body !== undefined) {
      if (typeof body === 'string') {
        payload = body;
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json; charset=utf-8';
      } else {
        payload = JSON.stringify(body);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json: any = null;
          try {
            json = JSON.parse(data);
          } catch {
            // Not JSON
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            rawBody: data,
            json,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

// MCP SSE Helper
class McpSseClient {
  private req: http.ClientRequest | null = null;
  public sessionId: string | null = null;
  public endpointUrl: string | null = null;
  private messageCallbacks = new Map<number | string, (response: any) => void>();
  private sseBuffer = '';

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsed = new URL('/mcp/sse', backendUrl);
      this.req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 80,
          path: parsed.pathname,
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`SSE connection failed with status ${res.statusCode}`));
          }
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            this.sseBuffer += chunk;
            this.processSseBuffer(resolve);
          });
          res.on('error', (err) => reject(err));
        }
      );
      this.req.on('error', (err) => reject(err));
      this.req.end();
    });
  }

  private processSseBuffer(onEndpoint?: () => void) {
    const lines = this.sseBuffer.split('\n');
    this.sseBuffer = lines.pop() || '';

    let currentEvent = 'message';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (currentEvent === 'endpoint') {
          this.endpointUrl = dataStr;
          const u = new URL(dataStr, backendUrl);
          this.sessionId = u.searchParams.get('sessionId');
          if (onEndpoint) onEndpoint();
        } else if (currentEvent === 'message') {
          try {
            const parsedJson = JSON.parse(dataStr);
            if (parsedJson.id !== undefined && this.messageCallbacks.has(parsedJson.id)) {
              const cb = this.messageCallbacks.get(parsedJson.id)!;
              this.messageCallbacks.delete(parsedJson.id);
              cb(parsedJson);
            }
          } catch {
            // ignore non-json
          }
        }
      }
    }
  }

  async sendJsonRpc(method: string, params: any = {}, timeoutMs = 8000): Promise<any> {
    if (!this.endpointUrl || !this.sessionId) {
      throw new Error('MCP SSE client not connected');
    }
    const id = Math.floor(Math.random() * 1000000);
    const body = { jsonrpc: '2.0', id, method, params };

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.messageCallbacks.delete(id);
        reject(new Error(`MCP JSON-RPC timed out after ${timeoutMs}ms for method ${method}`));
      }, timeoutMs);

      this.messageCallbacks.set(id, (resp) => {
        clearTimeout(timer);
        resolve(resp);
      });
    });

    const res = await httpRequest('POST', this.endpointUrl, body);
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`POST ${this.endpointUrl} returned status ${res.status}`);
    }

    return promise;
  }

  disconnect() {
    if (this.req) {
      this.req.destroy();
      this.req = null;
    }
  }
}

async function runTest(
  id: string,
  category: TestResult['category'],
  name: string,
  fn: () => Promise<void>
) {
  const start = Date.now();
  process.stdout.write(`  [TEST] ${id} - ${name} ... `);
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ id, name, category, passed: true, durationMs: duration });
    console.log(`${colors.green}✓ PASS${colors.reset} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({
      id,
      name,
      category,
      passed: false,
      durationMs: duration,
      error: err.message,
    });
    console.log(`${colors.red}✗ FAIL${colors.reset} (${duration}ms): ${err.message}`);
  }
}

// -------------------------------------------------------------
// MAIN TEST SUITE
// -------------------------------------------------------------
async function main() {
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}   BrainBoard Live E2E Challenger 1 Adversarial Test Harness    ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`Backend Target: ${backendUrl}\n`);

  // Verify health before starting
  const healthRes = await httpRequest('GET', '/api/health');
  assert(healthRes.status === 200, `Health check returned ${healthRes.status}`);
  console.log(`${colors.green}✓ Backend alive and responsive on /api/health.${colors.reset}\n`);

  // =============================================================
  // DOMAIN 1: BOUNDARY PAYLOADS & INPUT TAMPERING
  // =============================================================
  console.log(`${colors.bright}--- DOMAIN 1: BOUNDARY PAYLOADS & INPUT TAMPERING ---${colors.reset}`);

  await runTest('ADV-BND-01', 'BOUNDARY', 'Empty, null, and non-string titles rejected with 400 across all entity POSTs', async () => {
    let res = await httpRequest('POST', '/api/projects', { title: '' });
    assertEqual(res.status, 400, 'Empty project title must return 400');
    res = await httpRequest('POST', '/api/projects', { title: '   \t\n  ' });
    assertEqual(res.status, 400, 'Whitespace-only project title must return 400');
    res = await httpRequest('POST', '/api/projects', { title: 12345 });
    assertEqual(res.status, 400, 'Numeric project title must return 400');
    res = await httpRequest('POST', '/api/projects', { title: null });
    assertEqual(res.status, 400, 'Null project title must return 400');
    res = await httpRequest('POST', '/api/projects', {});
    assertEqual(res.status, 400, 'Empty object project creation must return 400');
  });

  await runTest('ADV-BND-02', 'BOUNDARY', 'Malformed HTTP JSON body handled gracefully with 400 and no server crash', async () => {
    const res = await httpRequest('POST', '/api/projects', '{"title": "Unclosed string', {
      'Content-Type': 'application/json',
    });
    assertEqual(res.status, 400, 'Malformed JSON must yield 400 Bad Request');
    const health = await httpRequest('GET', '/api/health');
    assertEqual(health.status, 200, 'Server must remain alive after malformed JSON');
  });

  await runTest('ADV-BND-03A', 'BOUNDARY', 'Large text payload (70KB) in businessLogic and UpdateLog stored with exact byte fidelity', async () => {
    const createdProjectIds: string[] = [];
    try {
      const paragraph = 'BrainBoard V2 architecture stress-testing paragraph with Markdown details.\n';
      const largeBusinessLogic = `# High Scale Architecture\n\n` + paragraph.repeat(900); // ~67KB
      const largeUpdateLog = `## Audit Trail Log\n\n` + paragraph.repeat(900); // ~67KB

      const prjRes = await httpRequest('POST', '/api/projects', {
        title: 'Challenger 70KB Payload Project',
        description: 'Testing 70KB text payloads',
        businessLogic: largeBusinessLogic,
      });
      assertEqual(prjRes.status, 201, '70KB businessLogic project creation must succeed');
      createdProjectIds.push(prjRes.json.id);
      assertEqual(prjRes.json.businessLogic.length, largeBusinessLogic.length, 'businessLogic length match');

      const logRes = await httpRequest('POST', `/api/projects/${prjRes.json.id}/update-logs`, {
        title: '70KB Audit Log',
        content: largeUpdateLog,
        author: 'Challenger-1',
      });
      assertEqual(logRes.status, 201, '70KB updateLog creation must succeed');
      assertEqual(logRes.json.content.length, largeUpdateLog.trim().length, 'updateLog length match after service trim');
      assertEqual(logRes.json.content, largeUpdateLog.trim(), 'updateLog content byte-for-byte fidelity');

      const fetchPrj = await httpRequest('GET', `/api/projects/${prjRes.json.id}`);
      assertEqual(fetchPrj.status, 200, 'Fetch project with large payload must succeed');
      assertEqual(fetchPrj.json.businessLogic.length, largeBusinessLogic.length, 'Persisted length match');
    } finally {
      for (const id of createdProjectIds) {
        await httpRequest('DELETE', `/api/projects/${id}`);
      }
    }
  });

  await runTest('ADV-BND-03B', 'BOUNDARY', 'Oversized HTTP payload (> 100KB body limit) rejected with HTTP 413 Payload Too Large without crashing', async () => {
    const paragraph = 'BrainBoard V2 enterprise scaling architecture stress-testing paragraph.\n';
    const oversizedBody = {
      title: 'Oversized Project',
      businessLogic: paragraph.repeat(1600), // ~115KB
    };

    const res = await httpRequest('POST', '/api/projects', oversizedBody);
    assertEqual(res.status, 413, 'Oversized body must return 413 Payload Too Large');

    // Server must remain alive
    const health = await httpRequest('GET', '/api/health');
    assertEqual(health.status, 200, 'Server must remain alive after 413');
  });

  await runTest('ADV-BND-04', 'BOUNDARY', 'Deeply nested JSON settings polymorphism (15 levels, arrays, booleans, nulls)', async () => {
    const createdProjectIds: string[] = [];
    try {
      let nestedObj: any = { leaf: 'deepest-value', count: 42, active: true, list: [1, 2, 'three', null] };
      for (let i = 0; i < 15; i++) {
        nestedObj = { level: i, child: nestedObj };
      }

      const res = await httpRequest('POST', '/api/projects', {
        title: 'Challenger Deep JSON Project',
        settings: nestedObj,
      });
      assertEqual(res.status, 201, 'Deeply nested settings creation must succeed');
      createdProjectIds.push(res.json.id);

      const fetched = await httpRequest('GET', `/api/projects/${res.json.id}`);
      assertEqual(fetched.status, 200, 'Fetch project settings must succeed');
      assertEqual(fetched.json.settings.level, 14, 'Outer level matches');

      let cur = fetched.json.settings;
      for (let i = 14; i >= 0; i--) {
        assertEqual(cur.level, i, `Level ${i} matches`);
        cur = cur.child;
      }
      assertEqual(cur.leaf, 'deepest-value', 'Deepest leaf node matches');
      assertEqual(cur.active, true, 'Boolean flag preserved');
    } finally {
      for (const id of createdProjectIds) {
        await httpRequest('DELETE', `/api/projects/${id}`);
      }
    }
  });

  await runTest('ADV-BND-05', 'BOUNDARY', 'Hostile injection strings (SQLi, XSS, Unicode ZWJ, Surrogate pairs, RTL, quotes, escapes)', async () => {
    const createdProjectIds: string[] = [];
    try {
      const hostilePayloads = [
        "Robert'); DROP TABLE \"Project\";--",
        "<script>alert('XSS')</script><iframe src='javascript:evil()'></iframe>",
        "👨‍👩‍👧‍👦 🏳️‍🌈 🚀 🛰️ 💻 ⚡ ⚛️",
        "اللغة العربية هي أكثر اللغات السامية تحدثا",
        "Unicode \u202E reverse text override \u202D and ANSI \x1b[31mRed\x1b[0m",
        "JSON Injection \",\"injected\":true,\"",
      ];

      for (const str of hostilePayloads) {
        const res = await httpRequest('POST', '/api/projects', {
          title: `Project: ${str.slice(0, 50)}`,
          description: str,
          businessLogic: str,
        });
        assertEqual(res.status, 201, `Creation with hostile payload must succeed: ${str.slice(0, 25)}`);
        createdProjectIds.push(res.json.id);

        const fetched = await httpRequest('GET', `/api/projects/${res.json.id}`);
        assertEqual(fetched.status, 200, 'Fetch must succeed');
        assertEqual(fetched.json.description, str, 'Fidelity preserved without sanitization corruption');
      }
    } finally {
      for (const id of createdProjectIds) {
        await httpRequest('DELETE', `/api/projects/${id}`);
      }
    }
  });

  await runTest('ADV-BND-06', 'BOUNDARY', 'PostgreSQL null byte (\\x00) rejection observation (server safely catches exception without crash)', async () => {
    // In PostgreSQL, \0 cannot be stored in UTF-8 text/varchar. Test that sending \0 does not crash Express.
    const res = await httpRequest('POST', '/api/projects', {
      title: 'Null Byte Test Project',
      description: 'Hostile \x00 null byte',
    });
    // Server rejects with 500 (DB error) or 400 (if sanitized). Either way, server must not crash.
    assert(res.status === 500 || res.status === 400, `Expected 500 or 400 for null byte, got ${res.status}`);

    const health = await httpRequest('GET', '/api/health');
    assertEqual(health.status, 200, 'Server remains alive and healthy after null byte rejection');
  });

  // =============================================================
  // DOMAIN 2: RAPID REQUESTS & HIGH CONCURRENCY
  // =============================================================
  console.log(`\n${colors.bright}--- DOMAIN 2: RAPID REQUESTS & HIGH CONCURRENCY ---${colors.reset}`);

  await runTest('ADV-CON-01', 'RAPID_CONCURRENCY', '50 simultaneous GET requests fired concurrently without connection exhaustion', async () => {
    const promises = Array.from({ length: 50 }, () => httpRequest('GET', '/api/projects'));
    const start = Date.now();
    const responses = await Promise.all(promises);
    const duration = Date.now() - start;

    for (const res of responses) {
      assertEqual(res.status, 200, 'Concurrent GET /api/projects must return 200');
      assert(Array.isArray(res.json), 'Response body must be an array');
    }
    assert(duration < 8000, `50 concurrent GETs completed in ${duration}ms (< 8000ms)`);
  });

  await runTest('ADV-CON-02', 'RAPID_CONCURRENCY', '20 concurrent project creations and immediate cleanup under load', async () => {
    const creationPromises = Array.from({ length: 20 }, (_, i) =>
      httpRequest('POST', '/api/projects', {
        title: `Concurrent Project ${i + 1} - ${Date.now()}`,
        description: `Stress load test item ${i + 1}`,
      })
    );

    const responses = await Promise.all(creationPromises);
    const createdIds: string[] = [];

    for (const res of responses) {
      assertEqual(res.status, 201, 'Concurrent project creation must return 201');
      assert(Boolean(res.json?.id), 'Response must have project id');
      createdIds.push(res.json.id);
    }

    const deletionPromises = createdIds.map((id) => httpRequest('DELETE', `/api/projects/${id}`));
    const delResponses = await Promise.all(deletionPromises);
    for (const res of delResponses) {
      assertEqual(res.status, 204, 'Concurrent deletion must return 204');
    }
  });

  await runTest('ADV-CON-03', 'RAPID_CONCURRENCY', 'Race-condition test: 15 concurrent updates to the same task simultaneously', async () => {
    let projectId = '';
    try {
      const prj = await httpRequest('POST', '/api/projects', { title: 'Race Condition Project' });
      projectId = prj.json.id;
      const stg = await httpRequest('POST', `/api/projects/${projectId}/stages`, { title: 'Stage Alpha' });
      const tsk = await httpRequest('POST', `/api/stages/${stg.json.id}/tasks`, { title: 'Target Task' });
      const taskId = tsk.json.id;

      const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
      const updatePromises = Array.from({ length: 15 }, (_, i) =>
        httpRequest('PATCH', `/api/tasks/${taskId}`, {
          title: `Updated Title #${i + 1}`,
          status: statuses[i % 3],
          description: `Timestamp: ${Date.now()}`,
        })
      );

      const updateResponses = await Promise.all(updatePromises);
      for (const res of updateResponses) {
        assertEqual(res.status, 200, 'Concurrent PATCH /api/tasks/:id must succeed (200)');
      }

      const finalRes = await httpRequest('GET', `/api/tasks/${taskId}`);
      assertEqual(finalRes.status, 200, 'Task must remain readable');
      assert(statuses.includes(finalRes.json.status), 'Task status must be valid');
    } finally {
      if (projectId) await httpRequest('DELETE', `/api/projects/${projectId}`);
    }
  });

  // =============================================================
  // DOMAIN 3: INVALID ENUM INPUTS
  // =============================================================
  console.log(`\n${colors.bright}--- DOMAIN 3: INVALID ENUM INPUTS ---${colors.reset}`);

  await runTest('ADV-ENM-01', 'INVALID_ENUMS', 'Invalid ProjectStatus enum values rejected with 400 across POST and PATCH', async () => {
    let projectId = '';
    try {
      let res = await httpRequest('POST', '/api/projects', {
        title: 'Invalid Enum Project',
        status: 'BLOCKED',
      });
      assertEqual(res.status, 400, 'Invalid ProjectStatus on POST must return 400');
      assert(res.json.error.includes('Invalid project status'), 'Descriptive error message');

      res = await httpRequest('POST', '/api/projects', {
        title: 'Invalid Enum Project',
        status: 'planning', // lowercase rejected
      });
      assertEqual(res.status, 400, 'Lowercase ProjectStatus on POST must return 400');

      const valid = await httpRequest('POST', '/api/projects', {
        title: 'Valid Project',
        status: 'PLANNING',
      });
      projectId = valid.json.id;

      res = await httpRequest('PATCH', `/api/projects/${projectId}`, { status: 'DELETED' });
      assertEqual(res.status, 400, 'Invalid ProjectStatus on PATCH must return 400');

      res = await httpRequest('PATCH', `/api/projects/${projectId}`, { status: 12345 });
      assertEqual(res.status, 400, 'Numeric ProjectStatus on PATCH must return 400');
    } finally {
      if (projectId) await httpRequest('DELETE', `/api/projects/${projectId}`);
    }
  });

  await runTest('ADV-ENM-02', 'INVALID_ENUMS', 'Invalid StageStatus enum values rejected with 400 across POST and PATCH', async () => {
    let projectId = '';
    try {
      const valid = await httpRequest('POST', '/api/projects', { title: 'Valid Project For Stage Enum' });
      projectId = valid.json.id;

      let res = await httpRequest('POST', `/api/projects/${projectId}/stages`, {
        title: 'Stage Invalid Status',
        status: 'TODO',
      });
      assertEqual(res.status, 400, 'Stage status "TODO" must be rejected with 400');
      assert(res.json.error.includes('Invalid stage status'), 'Error mentions Invalid stage status');

      const stg = await httpRequest('POST', `/api/projects/${projectId}/stages`, {
        title: 'Stage Valid',
        status: 'PLANNING',
      });
      assertEqual(stg.status, 201, 'Valid stage creation');

      res = await httpRequest('PATCH', `/api/stages/${stg.json.id}`, { status: 'CANCELLED' });
      assertEqual(res.status, 400, 'Stage PATCH with "CANCELLED" must return 400');
    } finally {
      if (projectId) await httpRequest('DELETE', `/api/projects/${projectId}`);
    }
  });

  await runTest('ADV-ENM-03', 'INVALID_ENUMS', 'Invalid Task status enum values rejected with 400 across POST and PATCH', async () => {
    let projectId = '';
    try {
      const valid = await httpRequest('POST', '/api/projects', { title: 'Valid Project For Task Enum' });
      projectId = valid.json.id;
      const stg = await httpRequest('POST', `/api/projects/${projectId}/stages`, { title: 'Stage 1' });

      let res = await httpRequest('POST', `/api/stages/${stg.json.id}/tasks`, {
        title: 'Task 1',
        status: 'PLANNING',
      });
      assertEqual(res.status, 400, 'Task status "PLANNING" must be rejected with 400');

      const tsk = await httpRequest('POST', `/api/stages/${stg.json.id}/tasks`, {
        title: 'Task 1',
        status: 'TODO',
      });
      assertEqual(tsk.status, 201, 'Valid task created');

      res = await httpRequest('PATCH', `/api/tasks/${tsk.json.id}`, { status: 'WAITING' });
      assertEqual(res.status, 400, 'Task PATCH status "WAITING" must return 400');

      res = await httpRequest('PATCH', `/api/tasks/${tsk.json.id}/status`, { status: 'DONE_ZOOM' });
      assertEqual(res.status, 400, 'Dedicated status route must return 400 for invalid enum');
    } finally {
      if (projectId) await httpRequest('DELETE', `/api/projects/${projectId}`);
    }
  });

  // =============================================================
  // DOMAIN 4: NON-EXISTENT UUIDS & MALFORMED IDENTIFIERS
  // =============================================================
  console.log(`\n${colors.bright}--- DOMAIN 4: NON-EXISTENT UUIDS & MALFORMED IDENTIFIERS ---${colors.reset}`);

  await runTest('ADV-UID-01', 'NON_EXISTENT_UUIDS', 'Non-existent UUID returns 404 across all entity endpoints (GET, PATCH, DELETE)', async () => {
    const dummyUuid = '00000000-0000-0000-0000-000000000000';

    const testEndpoints = [
      { method: 'GET', path: `/api/projects/${dummyUuid}` },
      { method: 'PATCH', path: `/api/projects/${dummyUuid}`, body: { title: 'Update' } },
      { method: 'DELETE', path: `/api/projects/${dummyUuid}` },
      { method: 'GET', path: `/api/stages/${dummyUuid}` },
      { method: 'PATCH', path: `/api/stages/${dummyUuid}`, body: { title: 'Update' } },
      { method: 'DELETE', path: `/api/stages/${dummyUuid}` },
      { method: 'GET', path: `/api/tasks/${dummyUuid}` },
      { method: 'PATCH', path: `/api/tasks/${dummyUuid}`, body: { title: 'Update' } },
      { method: 'DELETE', path: `/api/tasks/${dummyUuid}` },
      { method: 'PATCH', path: `/api/subtasks/${dummyUuid}`, body: { isDone: true } },
      { method: 'DELETE', path: `/api/subtasks/${dummyUuid}` },
      { method: 'GET', path: `/api/update-logs/${dummyUuid}` },
      { method: 'DELETE', path: `/api/update-logs/${dummyUuid}` },
      { method: 'GET', path: `/api/members/${dummyUuid}` },
      { method: 'PATCH', path: `/api/members/${dummyUuid}`, body: { name: 'Update' } },
      { method: 'DELETE', path: `/api/members/${dummyUuid}` },
    ];

    for (const ep of testEndpoints) {
      const res = await httpRequest(ep.method, ep.path, ep.body);
      assertEqual(res.status, 404, `${ep.method} ${ep.path} must return 404 for non-existent UUID`);
    }
  });

  await runTest('ADV-UID-02', 'NON_EXISTENT_UUIDS', 'Creating child entities under non-existent parent UUID returns 404 (FK constraint)', async () => {
    const dummyUuid = '00000000-0000-0000-0000-000000000000';

    let res = await httpRequest('POST', `/api/projects/${dummyUuid}/stages`, { title: 'Orphan Stage' });
    assertEqual(res.status, 404, 'Stage creation under missing project must return 404');

    res = await httpRequest('POST', `/api/projects/${dummyUuid}/update-logs`, {
      title: 'Orphan Log',
      content: 'Content',
      author: 'Author',
    });
    assertEqual(res.status, 404, 'UpdateLog creation under missing project must return 404');

    res = await httpRequest('POST', `/api/projects/${dummyUuid}/members`, {
      name: 'Orphan Member',
      role: 'Dev',
    });
    assertEqual(res.status, 404, 'Member creation under missing project must return 404');

    res = await httpRequest('POST', `/api/stages/${dummyUuid}/tasks`, { title: 'Orphan Task' });
    assertEqual(res.status, 404, 'Task creation under missing stage must return 404');

    res = await httpRequest('POST', `/api/tasks/${dummyUuid}/subtasks`, { title: 'Orphan Subtask' });
    assertEqual(res.status, 404, 'Subtask creation under missing task must return 404');
  });

  await runTest('ADV-UID-03', 'NON_EXISTENT_UUIDS', 'Malformed, non-UUID identifiers handled safely (400 or 404, never 500)', async () => {
    const malformedIds = ['invalid-id', '123', 'undefined', 'null', '%20', '..%2F..%2Fetc%2Fpasswd'];

    for (const badId of malformedIds) {
      const res = await httpRequest('GET', `/api/projects/${badId}`);
      assert(
        res.status === 404 || res.status === 400,
        `GET /api/projects/${badId} returned unexpected status ${res.status} (expected 404/400)`
      );
    }
  });

  // =============================================================
  // DOMAIN 5: CASCADING DELETIONS & HIERARCHY PURGING
  // =============================================================
  console.log(`\n${colors.bright}--- DOMAIN 5: CASCADING DELETIONS & HIERARCHY PURGING ---${colors.reset}`);

  await runTest('ADV-CAS-01', 'CASCADING_DELETIONS', 'Multi-tier cascading deletion: Deleting Project purges all child Stages, Tasks, Subtasks, Logs, and Members', async () => {
    const prj = await httpRequest('POST', '/api/projects', {
      title: 'Full Cascade Root Project',
      description: 'Cascade stress tree',
    });
    const projectId = prj.json.id;

    const stage1 = await httpRequest('POST', `/api/projects/${projectId}/stages`, { title: 'Stage One', order: 0 });
    const stage2 = await httpRequest('POST', `/api/projects/${projectId}/stages`, { title: 'Stage Two', order: 1 });
    const stage1Id = stage1.json.id;
    const stage2Id = stage2.json.id;

    const task1 = await httpRequest('POST', `/api/stages/${stage1Id}/tasks`, { title: 'Task 1.1' });
    const task2 = await httpRequest('POST', `/api/stages/${stage1Id}/tasks`, { title: 'Task 1.2' });
    const task3 = await httpRequest('POST', `/api/stages/${stage2Id}/tasks`, { title: 'Task 2.1' });
    const task4 = await httpRequest('POST', `/api/stages/${stage2Id}/tasks`, { title: 'Task 2.2' });

    const sub1 = await httpRequest('POST', `/api/tasks/${task1.json.id}/subtasks`, { title: 'Sub 1.1.1' });
    const sub2 = await httpRequest('POST', `/api/tasks/${task1.json.id}/subtasks`, { title: 'Sub 1.1.2' });
    const sub3 = await httpRequest('POST', `/api/tasks/${task3.json.id}/subtasks`, { title: 'Sub 2.1.1' });

    const log1 = await httpRequest('POST', `/api/projects/${projectId}/update-logs`, {
      title: 'Log 1',
      content: 'Log content 1',
      author: 'Author',
    });
    const log2 = await httpRequest('POST', `/api/projects/${projectId}/update-logs`, {
      title: 'Log 2',
      content: 'Log content 2',
      author: 'Author',
    });

    const mbr1 = await httpRequest('POST', `/api/projects/${projectId}/members`, {
      name: 'Alice',
      role: 'Engineer',
      email: 'alice@example.com',
    });
    const mbr2 = await httpRequest('POST', `/api/projects/${projectId}/members`, {
      name: 'Bob',
      role: 'Manager',
    });

    // Partial Deletion 1: Delete Task 1 (purges sub1, sub2)
    const delTask1 = await httpRequest('DELETE', `/api/tasks/${task1.json.id}`);
    assertEqual(delTask1.status, 204, 'Delete task 1 succeeds');
    assertEqual((await httpRequest('PATCH', `/api/subtasks/${sub1.json.id}`, { isDone: true })).status, 404, 'Subtask 1 purged');
    assertEqual((await httpRequest('PATCH', `/api/subtasks/${sub2.json.id}`, { isDone: true })).status, 404, 'Subtask 2 purged');
    assertEqual((await httpRequest('GET', `/api/stages/${stage1Id}`)).status, 200, 'Stage 1 still intact');
    assertEqual((await httpRequest('GET', `/api/tasks/${task2.json.id}`)).status, 200, 'Task 2 still intact');

    // Partial Deletion 2: Delete Stage 2 (purges task3, task4, sub3)
    const delStage2 = await httpRequest('DELETE', `/api/stages/${stage2Id}`);
    assertEqual(delStage2.status, 204, 'Delete stage 2 succeeds');
    assertEqual((await httpRequest('GET', `/api/tasks/${task3.json.id}`)).status, 404, 'Task 3 purged');
    assertEqual((await httpRequest('GET', `/api/tasks/${task4.json.id}`)).status, 404, 'Task 4 purged');
    assertEqual((await httpRequest('PATCH', `/api/subtasks/${sub3.json.id}`, { isDone: true })).status, 404, 'Subtask 3 purged');
    assertEqual((await httpRequest('GET', `/api/projects/${projectId}`)).status, 200, 'Project intact');
    assertEqual((await httpRequest('GET', `/api/stages/${stage1Id}`)).status, 200, 'Stage 1 intact');
    assertEqual((await httpRequest('GET', `/api/update-logs/${log1.json.id}`)).status, 200, 'Log 1 intact');
    assertEqual((await httpRequest('GET', `/api/members/${mbr1.json.id}`)).status, 200, 'Member 1 intact');

    // Root Cascade Deletion: Delete Project (purges all children)
    const delPrj = await httpRequest('DELETE', `/api/projects/${projectId}`);
    assertEqual(delPrj.status, 204, 'Delete project succeeds');
    assertEqual((await httpRequest('GET', `/api/projects/${projectId}`)).status, 404, 'Project 404');
    assertEqual((await httpRequest('GET', `/api/stages/${stage1Id}`)).status, 404, 'Stage 1 404');
    assertEqual((await httpRequest('GET', `/api/tasks/${task2.json.id}`)).status, 404, 'Task 2 404');
    assertEqual((await httpRequest('GET', `/api/update-logs/${log1.json.id}`)).status, 404, 'Log 1 404');
    assertEqual((await httpRequest('GET', `/api/update-logs/${log2.json.id}`)).status, 404, 'Log 2 404');
    assertEqual((await httpRequest('GET', `/api/members/${mbr1.json.id}`)).status, 404, 'Member 1 404');
    assertEqual((await httpRequest('GET', `/api/members/${mbr2.json.id}`)).status, 404, 'Member 2 404');
  });

  // =============================================================
  // DOMAIN 6: LIVE MCP SSE WIRE PROTOCOL RESILIENCE
  // =============================================================
  console.log(`\n${colors.bright}--- DOMAIN 6: LIVE MCP SSE WIRE PROTOCOL RESILIENCE ---${colors.reset}`);

  await runTest('ADV-MCP-01', 'MCP_SSE', 'Real MCP SSE Handshake, session discovery, and tools/list query', async () => {
    const client = new McpSseClient();
    try {
      await client.connect();
      assert(Boolean(client.sessionId), 'Valid sessionId obtained');
      assert(Boolean(client.endpointUrl), 'Valid endpointUrl obtained');

      const listResp = await client.sendJsonRpc('tools/list');
      assert(Boolean(listResp.result?.tools), 'tools/list returns tool array');
      const toolNames = listResp.result.tools.map((t: any) => t.name);

      const requiredTools = [
        'read_project_context',
        'update_business_logic',
        'update_project_settings',
        'log_project_update',
        'create_task',
        'move_task',
        'add_subtask',
        'toggle_subtask',
        'list_tasks',
        'get_task',
      ];
      for (const reqTool of requiredTools) {
        assert(toolNames.includes(reqTool), `MCP tool "${reqTool}" must be present in tools/list`);
      }
    } finally {
      client.disconnect();
    }
  });

  await runTest('ADV-MCP-02', 'MCP_SSE', 'Unknown MCP tool invocation returns JSON-RPC error without dropping SSE connection', async () => {
    const client = new McpSseClient();
    try {
      await client.connect();
      const resp = await client.sendJsonRpc('tools/call', {
        name: 'non_existent_tool_xyz',
        arguments: {},
      });

      assert(Boolean(resp.error) || (resp.result && resp.result.isError), 'Must report error for unknown tool');

      const validResp = await client.sendJsonRpc('tools/list');
      assert(Boolean(validResp.result?.tools), 'Session remains healthy after unknown tool call');
    } finally {
      client.disconnect();
    }
  });

  await runTest('ADV-MCP-03', 'MCP_SSE', 'Missing required arguments to MCP tools handled safely (read_project_context, log_project_update)', async () => {
    const client = new McpSseClient();
    try {
      await client.connect();

      let resp = await client.sendJsonRpc('tools/call', {
        name: 'read_project_context',
        arguments: {},
      });
      assert(Boolean(resp.error) || (resp.result && resp.result.isError), 'Missing projectId must return error');

      resp = await client.sendJsonRpc('tools/call', {
        name: 'log_project_update',
        arguments: { projectId: '00000000-0000-0000-0000-000000000000' },
      });
      assert(Boolean(resp.error) || (resp.result && resp.result.isError), 'Missing title/content must return error');
    } finally {
      client.disconnect();
    }
  });

  await runTest('ADV-MCP-04', 'MCP_SSE', 'POST /mcp/messages with expired or invalid sessionId returns 404', async () => {
    const invalidSessionId = crypto.randomUUID();
    const res = await httpRequest('POST', `/mcp/messages?sessionId=${invalidSessionId}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    assertEqual(res.status, 404, 'Unknown sessionId must return 404');
  });

  // =============================================================
  // SUMMARY AND VERDICT
  // =============================================================
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}               ADVERSARIAL CHALLENGE SUMMARY                    ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Adversarial Tests: ${total}`);
  console.log(`Passed:                  ${passed}`);
  console.log(`Failed:                  ${failed}`);
  console.log(`Pass Rate:               ${passRate}%\n`);

  console.log(`Results by Domain:`);
  const categories: TestResult['category'][] = [
    'BOUNDARY',
    'RAPID_CONCURRENCY',
    'INVALID_ENUMS',
    'NON_EXISTENT_UUIDS',
    'CASCADING_DELETIONS',
    'MCP_SSE',
  ];
  for (const cat of categories) {
    const catTests = results.filter((r) => r.category === cat);
    const catPassed = catTests.filter((r) => r.passed).length;
    console.log(`  - ${cat.padEnd(20)}: ${catPassed}/${catTests.length} passed`);
  }

  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  if (failed === 0) {
    console.log(`${colors.green}${colors.bright}VERDICT: APPROVE (All ${total} empirical adversarial tests passed)${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}VERDICT: REJECT (${failed} test(s) failed)${colors.reset}`);
  }
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in adversarial challenge suite:', err);
  process.exit(1);
});
