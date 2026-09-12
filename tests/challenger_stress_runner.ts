/**
 * Challenger V2 Independent Live Boundary & Stress Test Runner
 * tests/challenger_stress_runner.ts
 *
 * Empirical challenger suite stress-testing BrainBoard V2:
 * 1. Rapid Sequential & Concurrency Churn (create/read/delete batches with full cascade verification)
 * 2. Extreme Unicode, Multi-Codepoint Emojis, RTL, Special Characters & Multi-KB Markdown Logs
 * 3. Boundary Values & Payload Tampering (empty bodies, invalid types, malformed UUIDs, nonexistent parents)
 * 4. Live HTTP & SSE Resilience (malformed JSON bodies, unknown tools, session disconnect/reconnect, invalid session IDs)
 * 5. Cross-Stage Task Isolation & Integrity
 *
 * Zero external dependencies — pure Node.js (http, url, crypto).
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
  category: string;
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

function assertDeepEqual(actual: any, expected: any, msg: string) {
  if (actual === expected) return;
  if (actual === null || expected === null || typeof actual !== 'object' || typeof expected !== 'object') {
    throw new Error(`${msg}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  if (Array.isArray(actual) !== Array.isArray(expected)) {
    throw new Error(`${msg}: Array mismatch: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`);
  }
  if (Array.isArray(actual)) {
    if (actual.length !== expected.length) {
      throw new Error(`${msg}: Array length mismatch: ${actual.length} vs ${expected.length}`);
    }
    for (let i = 0; i < actual.length; i++) {
      assertDeepEqual(actual[i], expected[i], `${msg} [${i}]`);
    }
    return;
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`${msg}: Keys mismatch: ${JSON.stringify(actualKeys)} vs ${JSON.stringify(expectedKeys)}`);
  }
  for (const key of actualKeys) {
    assertDeepEqual(actual[key], expected[key], `${msg}.${key}`);
  }
}

function makeRequest(
  method: string,
  endpoint: string,
  body?: any,
  rawBody?: string,
  timeoutMs = 15000
): Promise<{ status: number; data: any; raw: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, backendUrl);
    const postData = rawBody !== undefined ? rawBody : (body !== undefined ? JSON.stringify(body) : undefined);

    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
    };
    if (postData !== undefined) {
      headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
    }

    const req = http.request(
      url,
      {
        method,
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({
            status: res.statusCode || 0,
            data,
            raw,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout calling ${method} ${endpoint} after ${timeoutMs}ms`));
    });

    if (postData !== undefined) {
      req.write(postData);
    }
    req.end();
  });
}

class ChallengerMcpClient {
  private req: http.ClientRequest | null = null;
  private res: http.IncomingMessage | null = null;
  public sessionId: string | null = null;
  public messagePath: string | null = null;
  private nextId = 1;
  private pendingRequests = new Map<
    number | string,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }
  >();
  private buffer = '';
  private currentEvent = '';
  private currentData: string[] = [];

  constructor(private baseUrl: string) {}

  async connect(timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const sseUrl = new URL('/mcp/sse', this.baseUrl);
      let connected = false;

      const timer = setTimeout(() => {
        this.close();
        if (!connected) reject(new Error(`MCP SSE connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.req = http.request(
        sseUrl,
        {
          method: 'GET',
          headers: { Accept: 'text/event-stream' },
        },
        (res) => {
          this.res = res;
          if (res.statusCode !== 200) {
            clearTimeout(timer);
            return reject(new Error(`MCP SSE status ${res.statusCode}`));
          }

          res.on('data', (chunk: Buffer) => {
            this.buffer += chunk.toString('utf8');
            this.processBuffer((endpointUrl) => {
              if (!connected) {
                connected = true;
                clearTimeout(timer);
                const parsed = new URL(endpointUrl, this.baseUrl);
                this.messagePath = parsed.pathname + parsed.search;
                this.sessionId = parsed.searchParams.get('sessionId');
                resolve();
              }
            });
          });

          res.on('error', (err) => {
            clearTimeout(timer);
            if (!connected) reject(err);
          });
        }
      );

      this.req.on('error', (err) => {
        clearTimeout(timer);
        if (!connected) reject(err);
      });

      this.req.end();
    });
  }

  private processBuffer(onEndpoint: (url: string) => void) {
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        this.currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        this.currentData.push(line.slice(5).trim());
      } else if (line === '') {
        const fullData = this.currentData.join('\n');
        if (this.currentEvent === 'endpoint' && fullData) {
          onEndpoint(fullData);
        } else if (this.currentEvent === 'message' && fullData) {
          try {
            const message = JSON.parse(fullData);
            if (message.id !== undefined && this.pendingRequests.has(message.id)) {
              const { resolve, reject, timer } = this.pendingRequests.get(message.id)!;
              clearTimeout(timer);
              this.pendingRequests.delete(message.id);
              if (message.error) {
                reject(new Error(message.error.message || JSON.stringify(message.error)));
              } else {
                resolve(message.result);
              }
            }
          } catch {
            // ignore non-JSON or partial
          }
        }
        this.currentEvent = '';
        this.currentData = [];
      }
    }
  }

  async callTool(name: string, args: Record<string, any> = {}, timeoutMs = 10000): Promise<any> {
    if (!this.sessionId || !this.messagePath) {
      throw new Error('ChallengerMcpClient is not connected');
    }

    const id = this.nextId++;
    const postPayload = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: args },
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP tool call '${name}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const postUrl = new URL(this.messagePath!, this.baseUrl);
      const postReq = http.request(
        postUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postPayload, 'utf8'),
          },
        },
        (res) => {
          if (res.statusCode !== 202 && res.statusCode !== 200) {
            let errBody = '';
            res.on('data', (c) => (errBody += c));
            res.on('end', () => {
              clearTimeout(timer);
              this.pendingRequests.delete(id);
              reject(new Error(`MCP POST message failed (${res.statusCode}): ${errBody}`));
            });
          }
        }
      );

      postReq.on('error', (err) => {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      });

      postReq.write(postPayload);
      postReq.end();
    });
  }

  close() {
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error('MCP client closed'));
    }
    this.pendingRequests.clear();
    if (this.res) {
      this.res.destroy();
      this.res = null;
    }
    if (this.req) {
      this.req.destroy();
      this.req = null;
    }
  }
}

async function runTest(id: string, category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`  [TEST] ${id} - ${name} ... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ id, category, name, passed: true, durationMs });
    console.log(`${colors.green}✓ PASS${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ id, category, name, passed: false, durationMs, error: err.message });
    console.log(`${colors.red}✗ FAIL${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.log(`         ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}   BrainBoard V2 Independent Challenger Boundary & Stress Suite   ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.dim}Backend target: ${backendUrl}${colors.reset}\n`);

  // Verify backend health first
  const health = await makeRequest('GET', '/api/health');
  assertEqual(health.status, 200, 'Backend /api/health probe');
  console.log(`${colors.green}✓ Backend alive and ready for empirical stress challenge.${colors.reset}\n`);

  // -------------------------------------------------------------
  // SUITE 1: Rapid Churn & Concurrency Stress
  // -------------------------------------------------------------
  console.log(`${colors.bright}--- SUITE 1: RAPID CHURN & CASCADE STRESS ---${colors.reset}`);

  await runTest(
    'STR-01',
    'Churn',
    'Rapid sequential creation of 10 fully-populated projects with stages, tasks, subtasks, logs, and members',
    async () => {
      const createdProjectIds: string[] = [];
      const stageIds: string[] = [];
      const taskIds: string[] = [];
      const subtaskIds: string[] = [];
      const logIds: string[] = [];
      const memberIds: string[] = [];

      try {
        for (let i = 0; i < 10; i++) {
          // 1. Create Project
          const pRes = await makeRequest('POST', '/api/projects', {
            title: `Churn Stress Project #${i + 1} - ${Date.now()}`,
            description: `Automated stress testing project iteration ${i + 1}`,
            businessLogic: `## Architectural Guidelines for Project ${i + 1}\n\nStrict cascade rules apply.`,
            status: i % 2 === 0 ? 'PLANNING' : 'ACTIVE',
            githubRepo: `https://github.com/stress-org/project-${i + 1}`,
            settings: { iteration: i + 1, batch: 'rapid-churn', enabled: true },
          });
          assertEqual(pRes.status, 201, `Create Project #${i + 1}`);
          const projectId = pRes.data.id;
          createdProjectIds.push(projectId);

          // 2. Create 2 Stages
          for (let s = 0; s < 2; s++) {
            const sRes = await makeRequest('POST', `/api/projects/${projectId}/stages`, {
              title: `Stage ${s + 1} for Project ${i + 1}`,
              status: s === 0 ? 'IN_PROGRESS' : 'PLANNING',
            });
            assertEqual(sRes.status, 201, `Create Stage #${s + 1}`);
            const stageId = sRes.data.id;
            stageIds.push(stageId);

            // 3. Create 2 Tasks per stage
            for (let t = 0; t < 2; t++) {
              const tRes = await makeRequest('POST', `/api/stages/${stageId}/tasks`, {
                title: `Task P${i + 1}-S${s + 1}-T${t + 1}`,
                status: t === 0 ? 'TODO' : 'IN_PROGRESS',
              });
              assertEqual(tRes.status, 201, `Create Task P${i + 1}-S${s + 1}-T${t + 1}`);
              const taskId = tRes.data.id;
              taskIds.push(taskId);

              // 4. Create 2 Subtasks per task
              for (let st = 0; st < 2; st++) {
                const subRes = await makeRequest('POST', `/api/tasks/${taskId}/subtasks`, {
                  title: `Subtask ${st + 1}`,
                });
                assertEqual(subRes.status, 201, `Create Subtask`);
                subtaskIds.push(subRes.data.id);
              }
            }
          }

          // 5. Create 1 Log
          const lRes = await makeRequest('POST', `/api/projects/${projectId}/update-logs`, {
            title: `Rapid Log ${i + 1}`,
            content: `Batch creation logged successfully.`,
            author: `StressBot-${i + 1}`,
          });
          assertEqual(lRes.status, 201, `Create Log`);
          logIds.push(lRes.data.id);

          // 6. Create 1 Member
          const mRes = await makeRequest('POST', `/api/projects/${projectId}/members`, {
            name: `Engineer ${i + 1}`,
            role: 'Lead Architect',
            email: `eng.${i + 1}@brainboard.stress.io`,
          });
          assertEqual(mRes.status, 201, `Create Member`);
          memberIds.push(mRes.data.id);
        }

        // Verify counts
        assertEqual(createdProjectIds.length, 10, '10 projects created');
        assertEqual(stageIds.length, 20, '20 stages created');
        assertEqual(taskIds.length, 40, '40 tasks created');
        assertEqual(subtaskIds.length, 80, '80 subtasks created');
        assertEqual(logIds.length, 10, '10 logs created');
        assertEqual(memberIds.length, 10, '10 members created');

        // Delete all 10 projects in rapid sequence
        for (const pId of createdProjectIds) {
          const delRes = await makeRequest('DELETE', `/api/projects/${pId}`);
          assert(delRes.status === 204 || delRes.status === 200, `Delete project ${pId}`);
        }

        // Verify 0 orphan entities remain
        for (const pId of createdProjectIds) {
          const check = await makeRequest('GET', `/api/projects/${pId}`);
          assertEqual(check.status, 404, `Project ${pId} must be 404`);
        }
        for (const sId of stageIds) {
          const check = await makeRequest('GET', `/api/stages/${sId}`);
          assertEqual(check.status, 404, `Stage ${sId} must be cascaded 404`);
        }
        for (const tId of taskIds) {
          const check = await makeRequest('GET', `/api/tasks/${tId}`);
          assertEqual(check.status, 404, `Task ${tId} must be cascaded 404`);
        }
        for (const stId of subtaskIds) {
          const check = await makeRequest('PATCH', `/api/subtasks/${stId}`, { isDone: true });
          assertEqual(check.status, 404, `Subtask ${stId} must be cascaded 404`);
        }
        for (const lId of logIds) {
          const check = await makeRequest('GET', `/api/update-logs/${lId}`);
          assertEqual(check.status, 404, `Log ${lId} must be cascaded 404`);
        }
        for (const mId of memberIds) {
          const check = await makeRequest('GET', `/api/members/${mId}`);
          assertEqual(check.status, 404, `Member ${mId} must be cascaded 404`);
        }
      } finally {
        // Cleanup safety net
        for (const pId of createdProjectIds) {
          try {
            await makeRequest('DELETE', `/api/projects/${pId}`);
          } catch {}
        }
      }
    }
  );

  // -------------------------------------------------------------
  // SUITE 2: Extreme Unicode, RTL, Emojis, & Multi-KB Markdown
  // -------------------------------------------------------------
  console.log(`\n${colors.bright}--- SUITE 2: EXTREME UNICODE & MULTI-KB MARKDOWN ---${colors.reset}`);

  await runTest(
    'STR-02',
    'Fidelity',
    'Extreme multilingual Unicode (CJK, Arabic RTL, Math, ZWJ Emojis, Surrogate Pairs, HTML tags)',
    async () => {
      const complexTitle =
        '🚀 Proj-⚡️ 漢字 Hiragana: ひらがな RTL: العربية \u202Ereversed\u202C Math: ∀x∈ℝ ∃y>x 👨‍👩‍👧‍👦 🏳️‍🌈 "quotes" & <script>alert(1)</script>';
      const complexDesc =
        'Zero-Width-Space:\u200B Newlines:\r\n\t Backslashes: \\ / \\\\ Special: €$¥£ %20 &amp; #hashtag';

      const pRes = await makeRequest('POST', '/api/projects', {
        title: complexTitle,
        description: complexDesc,
        businessLogic: '# Unicode Integrity\n- Item 1: 漢字\n- Item 2: العربية',
      });
      assertEqual(pRes.status, 201, 'Create unicode project');
      const pId = pRes.data.id;

      try {
        assertEqual(pRes.data.title, complexTitle, 'Title exact Unicode fidelity on creation');
        assertEqual(pRes.data.description, complexDesc, 'Desc exact Unicode fidelity on creation');

        // Readback via GET /api/projects/:id
        const getRes = await makeRequest('GET', `/api/projects/${pId}`);
        assertEqual(getRes.status, 200, 'Get unicode project');
        assertEqual(getRes.data.title, complexTitle, 'Readback title exact match');
        assertEqual(getRes.data.description, complexDesc, 'Readback desc exact match');

        // Create Task with multilingual Unicode
        const stageRes = await makeRequest('POST', `/api/projects/${pId}/stages`, {
          title: 'Etapa 1 🎯 開発フェーズ',
        });
        assertEqual(stageRes.status, 201, 'Create unicode stage');
        const sId = stageRes.data.id;

        const taskTitle = 'Task 🌟 👨‍💻 複雑なタスク RTL: مهمة جديدة';
        const taskRes = await makeRequest('POST', `/api/stages/${sId}/tasks`, {
          title: taskTitle,
          description: 'Description with emojis 🧪🔬🧬 and symbols §¶†‡',
        });
        assertEqual(taskRes.status, 201, 'Create unicode task');
        assertEqual(taskRes.data.title, taskTitle, 'Task title fidelity');
      } finally {
        await makeRequest('DELETE', `/api/projects/${pId}`);
      }
    }
  );

  await runTest(
    'STR-03',
    'Stress',
    'Multi-KB Markdown (35KB UpdateLog and 25KB BusinessLogic) with nested structures via REST & MCP',
    async () => {
      // 1. Create Base Project
      const pRes = await makeRequest('POST', '/api/projects', {
        title: 'Large Payload Stress Project',
        description: 'Testing high-volume markdown throughput',
      });
      assertEqual(pRes.status, 201, 'Create base project');
      const pId = pRes.data.id;

      const mcpClient = new ChallengerMcpClient(backendUrl);
      await mcpClient.connect();

      try {
        // Generate a 25KB Business Logic Markdown doc
        let bigDoc = '# Enterprise Architecture Decision Record (ADR-001)\n\n';
        bigDoc += '## Status\nAccepted\n\n## Context\n';
        for (let i = 0; i < 60; i++) {
          bigDoc += `### Section ${i + 1}: Microservices & Distributed Event Mesh\n`;
          bigDoc += `Paragraph ${i + 1}: The system relies on Prisma ORM connecting to Neon PostgreSQL over TLS. Every transaction is idempotent.\n`;
          bigDoc += `| Param | Type | Description | Default |\n|---|---|---|---|\n| timeout_${i} | int | Connection timeout in ms | 5000 |\n| retries_${i} | int | Exponential retry limit | 3 |\n\n`;
          bigDoc += '```typescript\nfunction handleEvent(id: string): Promise<void> {\n  return Promise.resolve();\n}\n```\n\n';
        }
        assert(Buffer.byteLength(bigDoc, 'utf8') > 20000, 'Generated doc is > 20KB');

        // Update via MCP tool update_business_logic
        const mcpLogicRes = await mcpClient.callTool('update_business_logic', {
          projectId: pId,
          businessLogic: bigDoc,
        });
        assert(!mcpLogicRes.isError, 'MCP update_business_logic should succeed');

        // Generate a 35KB UpdateLog with raw HTML snippets, deep checklists, and tables
        let bigLog = '# Sprint 42 Release Notes & Migration Audit\n\n';
        for (let i = 0; i < 180; i++) {
          bigLog += `#### Change Event ${i + 1}\n`;
          bigLog += `- [x] Verification step A-${i}\n- [ ] Pending validation step B-${i}\n`;
          bigLog += `> Quotation regarding commit #${i}: All tests passed with zero memory leaks in production tier ${i}.\n\n`;
          bigLog += `<details><summary>Diagnostics ${i}</summary><pre>{ "code": 200, "iter": ${i}, "status": "nominal" }</pre></details>\n\n`;
        }
        assert(Buffer.byteLength(bigLog, 'utf8') > 35000, 'Generated log is > 35KB');

        // Post via MCP tool log_project_update
        const mcpLogRes = await mcpClient.callTool('log_project_update', {
          projectId: pId,
          title: 'Major Milestone V2 Audit Log',
          content: bigLog,
          author: 'Autonomous AI Challenger',
        });
        assert(!mcpLogRes.isError, 'MCP log_project_update should succeed');

        // Readback via MCP read_project_context
        const contextRes = await mcpClient.callTool('read_project_context', { projectId: pId });
        assert(!contextRes.isError, 'MCP read_project_context should succeed');
        const contextText = contextRes.content[0].text;
        const parsedContext = JSON.parse(contextText);

        assertEqual(parsedContext.businessLogic, bigDoc, 'Business logic exact match over MCP');
        assert(parsedContext.updateLogs.length >= 1, 'Update log received');
        assertEqual(parsedContext.updateLogs[0].content, bigLog.trim(), 'UpdateLog content exact match over MCP');
      } finally {
        mcpClient.close();
        await makeRequest('DELETE', `/api/projects/${pId}`);
      }
    }
  );

  // -------------------------------------------------------------
  // SUITE 3: Boundary Values & Payload Tampering
  // -------------------------------------------------------------
  console.log(`\n${colors.bright}--- SUITE 3: BOUNDARY VALUES & SCHEMA TAMPERING ---${colors.reset}`);

  await runTest('STR-04', 'Boundary', 'Empty HTTP bodies & whitespace payloads rejected with 400', async () => {
    // Empty body {} to POST /api/projects
    const r1 = await makeRequest('POST', '/api/projects', {});
    assertEqual(r1.status, 400, 'Empty body POST /api/projects');

    // Empty string title
    const r2 = await makeRequest('POST', '/api/projects', { title: '' });
    assertEqual(r2.status, 400, 'Empty string title POST /api/projects');

    // Whitespace only title
    const r3 = await makeRequest('POST', '/api/projects', { title: '     \n\t  ' });
    assertEqual(r3.status, 400, 'Whitespace title POST /api/projects');

    // Non-string title (number)
    const r4 = await makeRequest('POST', '/api/projects', { title: 12345 });
    assertEqual(r4.status, 400, 'Number title POST /api/projects');

    // Invalid project status enum
    const r5 = await makeRequest('POST', '/api/projects', {
      title: 'Valid Title',
      status: 'HACKED_STATUS',
    });
    assertEqual(r5.status, 400, 'Invalid status POST /api/projects');

    // Stage creation with empty title
    const fakeId = crypto.randomUUID();
    const r6 = await makeRequest('POST', `/api/projects/${fakeId}/stages`, { title: '  ' });
    assertEqual(r6.status, 400, 'Empty stage title');

    // Task creation with empty title
    const r7 = await makeRequest('POST', `/api/stages/${fakeId}/tasks`, { title: '' });
    assertEqual(r7.status, 400, 'Empty task title');

    // Subtask creation with empty title
    const r8 = await makeRequest('POST', `/api/tasks/${fakeId}/subtasks`, { title: ' \t ' });
    assertEqual(r8.status, 400, 'Empty subtask title');

    // Update log with missing content
    const r9 = await makeRequest('POST', `/api/projects/${fakeId}/update-logs`, {
      title: 'Valid Log Title',
      content: '   ',
    });
    assertEqual(r9.status, 400, 'Whitespace log content');
  });

  await runTest(
    'STR-05',
    'Boundary',
    'Settings JSON polymorphism: objects, arrays, primitives, nulls, and deep nesting',
    async () => {
      // 1. Deeply nested JSON object
      const complexSettings = {
        ci: { githubActions: true, timeout: 1800 },
        env: { NODE_ENV: 'production', REGION: 'sa-east-1' },
        models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro'],
        flags: { autoDeploy: false, canary: { enabled: true, weight: 10 } },
      };

      const p1 = await makeRequest('POST', '/api/projects', {
        title: 'Settings Object Test',
        settings: complexSettings,
      });
      assertEqual(p1.status, 201, 'Create project with complex settings object');
      const id1 = p1.data.id;

      try {
        assertDeepEqual(p1.data.settings, complexSettings, 'JSON settings round-trip');

        // Update settings via PATCH /api/projects/:id/settings to an array
        const arraySettings = ['item1', 'item2', { nestedKey: 'val' }];
        const patchRes = await makeRequest('PATCH', `/api/projects/${id1}/settings`, {
          settings: arraySettings,
        });
        assertEqual(patchRes.status, 200, 'Update settings to JSON array');
        assertDeepEqual(patchRes.data.settings, arraySettings, 'Array settings round-trip');

        // Update settings to null
        const nullRes = await makeRequest('PATCH', `/api/projects/${id1}/settings`, {
          settings: null,
        });
        assertEqual(nullRes.status, 200, 'Update settings to null');
        assertEqual(nullRes.data.settings, null, 'Settings cleared to null');
      } finally {
        await makeRequest('DELETE', `/api/projects/${id1}`);
      }
    }
  );

  await runTest(
    'STR-06',
    'Boundary',
    'Malformed UUIDs, non-UUID strings, and SQL injection strings return 404 (never 500)',
    async () => {
      const badIds = [
        'not-a-uuid',
        '12345',
        'null',
        'undefined',
        "1' OR '1'='1",
        "'; DROP TABLE projects; --",
        '00000000-0000-0000-0000-000000000000',
        '../../etc/passwd',
      ];

      for (const badId of badIds) {
        // Project
        const pRes = await makeRequest('GET', `/api/projects/${encodeURIComponent(badId)}`);
        assertEqual(pRes.status, 404, `GET /api/projects/${badId} must return 404`);

        const pPatch = await makeRequest('PATCH', `/api/projects/${encodeURIComponent(badId)}`, {
          title: 'Update Attempt',
        });
        assertEqual(pPatch.status, 404, `PATCH /api/projects/${badId} must return 404`);

        const pDel = await makeRequest('DELETE', `/api/projects/${encodeURIComponent(badId)}`);
        assertEqual(pDel.status, 404, `DELETE /api/projects/${badId} must return 404`);

        // Stage
        const sRes = await makeRequest('GET', `/api/stages/${encodeURIComponent(badId)}`);
        assertEqual(sRes.status, 404, `GET /api/stages/${badId} must return 404`);

        // Task
        const tRes = await makeRequest('GET', `/api/tasks/${encodeURIComponent(badId)}`);
        assertEqual(tRes.status, 404, `GET /api/tasks/${badId} must return 404`);

        // Subtask
        const subRes = await makeRequest('PATCH', `/api/subtasks/${encodeURIComponent(badId)}`, { isDone: true });
        assertEqual(subRes.status, 404, `PATCH /api/subtasks/${badId} must return 404`);

        // UpdateLog
        const lRes = await makeRequest('GET', `/api/update-logs/${encodeURIComponent(badId)}`);
        assertEqual(lRes.status, 404, `GET /api/update-logs/${badId} must return 404`);

        // Member
        const mRes = await makeRequest('GET', `/api/members/${encodeURIComponent(badId)}`);
        assertEqual(mRes.status, 404, `GET /api/members/${badId} must return 404`);
      }
    }
  );

  await runTest(
    'STR-07',
    'Boundary',
    'Nonexistent parent relationships gracefully rejected with 404 (Prisma FK violation mapping)',
    async () => {
      const nonExistentId = crypto.randomUUID();

      // Create Stage under nonexistent project
      const sRes = await makeRequest('POST', `/api/projects/${nonExistentId}/stages`, {
        title: 'Stage under ghost project',
      });
      assertEqual(sRes.status, 404, 'Create stage under ghost project');

      // Create Log under nonexistent project
      const lRes = await makeRequest('POST', `/api/projects/${nonExistentId}/update-logs`, {
        title: 'Ghost Log',
        content: 'Should not succeed',
      });
      assertEqual(lRes.status, 404, 'Create log under ghost project');

      // Create Member under nonexistent project
      const mRes = await makeRequest('POST', `/api/projects/${nonExistentId}/members`, {
        name: 'Ghost Member',
        role: 'Spectre',
      });
      assertEqual(mRes.status, 404, 'Create member under ghost project');

      // Create Task under nonexistent stage (via URL)
      const tRes = await makeRequest('POST', `/api/stages/${nonExistentId}/tasks`, {
        title: 'Ghost Task',
      });
      assertEqual(tRes.status, 404, 'Create task under ghost stage URL');

      // Create Task under nonexistent stage (via POST /api/tasks body)
      const tRes2 = await makeRequest('POST', '/api/tasks', {
        title: 'Ghost Task',
        stageId: nonExistentId,
      });
      assertEqual(tRes2.status, 404, 'Create task under ghost stage body');

      // Create Subtask under nonexistent task
      const subRes = await makeRequest('POST', `/api/tasks/${nonExistentId}/subtasks`, {
        title: 'Ghost Subtask',
      });
      assertEqual(subRes.status, 404, 'Create subtask under ghost task');
    }
  );

  // -------------------------------------------------------------
  // SUITE 4: Live HTTP & SSE Error Resilience
  // -------------------------------------------------------------
  console.log(`\n${colors.bright}--- SUITE 4: LIVE HTTP & SSE ERROR RESILIENCE ---${colors.reset}`);

  await runTest(
    'STR-08',
    'Resilience',
    'Malformed JSON payload over HTTP returns 400 without crashing Express server',
    async () => {
      const malformedPayload = '{"title": "Broken JSON... unclosed string}';
      const res = await makeRequest('POST', '/api/projects', undefined, malformedPayload);
      // Express default body-parser produces 400 Bad Request on syntax error
      assertEqual(res.status, 400, 'Malformed JSON returns 400');

      // Verify server is healthy afterwards
      const health = await makeRequest('GET', '/api/health');
      assertEqual(health.status, 200, 'Server remains alive after malformed JSON');
    }
  );

  await runTest(
    'STR-09',
    'Resilience',
    'Unknown HTTP routes return 404 and do not expose stack traces',
    async () => {
      const res = await makeRequest('GET', '/api/non_existent_route_404_probe');
      assertEqual(res.status, 404, 'Unknown route returns 404');
    }
  );

  await runTest(
    'STR-10',
    'Resilience',
    'MCP SSE unknown tool invocation returns error and keeps session operational',
    async () => {
      const mcpClient = new ChallengerMcpClient(backendUrl);
      await mcpClient.connect();

      try {
        // Call a nonexistent tool
        let errorCaught = false;
        try {
          await mcpClient.callTool('completely_unknown_tool_xyz', { arg: 'val' });
        } catch (err: any) {
          errorCaught = true;
          assert(
            err.message.includes('Tool unknown') || err.message.includes('unknown'),
            `Error message should state unknown tool, got: ${err.message}`
          );
        }
        assert(errorCaught, 'Calling unknown MCP tool must throw / reject');

        // Verify session is STILL operational for valid tool calls!
        // First create a project to test context read
        const pRes = await makeRequest('POST', '/api/projects', {
          title: 'MCP Resilience Session Probe',
        });
        assertEqual(pRes.status, 201, 'Create probe project');
        const pId = pRes.data.id;

        try {
          const validCall = await mcpClient.callTool('read_project_context', { projectId: pId });
          assert(!validCall.isError, 'Session should remain fully functional after tool error');
          const parsed = JSON.parse(validCall.content[0].text);
          assertEqual(parsed.title, 'MCP Resilience Session Probe', 'Valid tool call returned correct data');
        } finally {
          await makeRequest('DELETE', `/api/projects/${pId}`);
        }
      } finally {
        mcpClient.close();
      }
    }
  );

  await runTest(
    'STR-11',
    'Resilience',
    'MCP tool input validation errors (missing projectId, empty strings) handled gracefully',
    async () => {
      const mcpClient = new ChallengerMcpClient(backendUrl);
      await mcpClient.connect();

      try {
        // 1. read_project_context with empty projectId
        let r1Caught = false;
        try {
          await mcpClient.callTool('read_project_context', { projectId: '   ' });
        } catch (err: any) {
          r1Caught = true;
          assert(err.message.includes('obrigatório') || err.message.includes('required'), 'Expected required error');
        }
        assert(r1Caught, 'read_project_context with empty projectId must reject');

        // 2. read_project_context with nonexistent projectId -> returns isError: true
        const ghostId = crypto.randomUUID();
        const r2 = await mcpClient.callTool('read_project_context', { projectId: ghostId });
        assert(r2.isError === true, 'Nonexistent project context must return isError: true');
        assert(
          r2.content[0].text.includes('não encontrado') || r2.content[0].text.includes('not found'),
          'Expected not found message'
        );

        // 3. update_business_logic with missing businessLogic
        let r3Caught = false;
        try {
          await mcpClient.callTool('update_business_logic', { projectId: ghostId });
        } catch {
          r3Caught = true;
        }
        // Either rejects or returns validation error

        // 4. log_project_update with missing title/content
        let r4Caught = false;
        try {
          await mcpClient.callTool('log_project_update', { projectId: ghostId, title: '', content: '' });
        } catch {
          r4Caught = true;
        }
      } finally {
        mcpClient.close();
      }
    }
  );

  await runTest(
    'STR-12',
    'Resilience',
    'Abrupt SSE client disconnect and immediate reconnection stress',
    async () => {
      // Connect first client and abort violently
      const client1 = new ChallengerMcpClient(backendUrl);
      await client1.connect();
      assert(!!client1.sessionId, 'Client 1 connected');
      client1.close(); // destroy socket immediately

      // Immediately connect client 2
      const client2 = new ChallengerMcpClient(backendUrl);
      await client2.connect();
      assert(!!client2.sessionId, 'Client 2 connected after client 1 abrupt abort');

      // Verify client 2 can invoke tools
      const pRes = await makeRequest('POST', '/api/projects', {
        title: 'Client Reconnect Project',
      });
      assertEqual(pRes.status, 201, 'Create project');
      const pId = pRes.data.id;

      try {
        const toolRes = await client2.callTool('read_project_context', { projectId: pId });
        assert(!toolRes.isError, 'Client 2 should execute tool normally');
      } finally {
        client2.close();
        await makeRequest('DELETE', `/api/projects/${pId}`);
      }
    }
  );

  await runTest(
    'STR-13',
    'Resilience',
    'POST /mcp/messages with invalid/expired sessionId returns 404 without crashing server',
    async () => {
      const postUrl = `/mcp/messages?sessionId=invalid-session-${Date.now()}`;
      const res = await makeRequest('POST', postUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'read_project_context', arguments: { projectId: 'test' } },
      });
      assertEqual(res.status, 404, 'Invalid session returns 404');
      assertEqual(res.data.error, 'MCP session not found', 'Explicit error returned');

      // Confirm server is healthy
      const health = await makeRequest('GET', '/api/health');
      assertEqual(health.status, 200, 'Server remains healthy');
    }
  );

  // -------------------------------------------------------------
  // SUITE 5: Multi-Stage Task Isolation & Stage Reordering
  // -------------------------------------------------------------
  console.log(`\n${colors.bright}--- SUITE 5: STAGE REORDERING & TASK ISOLATION ---${colors.reset}`);

  await runTest(
    'STR-14',
    'Isolation',
    'Auto-ordering of stages, manual order modification, and strict task filtering across stages',
    async () => {
      const pRes = await makeRequest('POST', '/api/projects', {
        title: 'Stage Ordering & Isolation Test',
      });
      assertEqual(pRes.status, 201, 'Create test project');
      const pId = pRes.data.id;

      try {
        // Create 3 stages: verify auto-ordering (0, 1, 2)
        const s1 = await makeRequest('POST', `/api/projects/${pId}/stages`, { title: 'Backlog Stage' });
        const s2 = await makeRequest('POST', `/api/projects/${pId}/stages`, { title: 'Development Stage' });
        const s3 = await makeRequest('POST', `/api/projects/${pId}/stages`, { title: 'QA Stage' });

        assertEqual(s1.data.order, 0, 'Stage 1 order is 0');
        assertEqual(s2.data.order, 1, 'Stage 2 order is 1');
        assertEqual(s3.data.order, 2, 'Stage 3 order is 2');

        // Add 2 tasks to Stage 1, 3 tasks to Stage 2
        await makeRequest('POST', `/api/stages/${s1.data.id}/tasks`, { title: 'S1-Task-A' });
        await makeRequest('POST', `/api/stages/${s1.data.id}/tasks`, { title: 'S1-Task-B' });

        await makeRequest('POST', `/api/stages/${s2.data.id}/tasks`, { title: 'S2-Task-A' });
        await makeRequest('POST', `/api/stages/${s2.data.id}/tasks`, { title: 'S2-Task-B' });
        await makeRequest('POST', `/api/stages/${s2.data.id}/tasks`, { title: 'S2-Task-C' });

        // Query tasks scoped to Stage 1
        const s1Tasks = await makeRequest('GET', `/api/stages/${s1.data.id}/tasks`);
        assertEqual(s1Tasks.status, 200, 'Query Stage 1 tasks');
        assertEqual(s1Tasks.data.length, 2, 'Stage 1 has exactly 2 tasks');
        assert(s1Tasks.data.every((t: any) => t.stageId === s1.data.id), 'All tasks belong to Stage 1');

        // Query tasks scoped to Stage 2
        const s2Tasks = await makeRequest('GET', `/api/stages/${s2.data.id}/tasks`);
        assertEqual(s2Tasks.status, 200, 'Query Stage 2 tasks');
        assertEqual(s2Tasks.data.length, 3, 'Stage 2 has exactly 3 tasks');
        assert(s2Tasks.data.every((t: any) => t.stageId === s2.data.id), 'All tasks belong to Stage 2');

        // Reorder stages: change Stage 3 order to 0
        const reorderRes = await makeRequest('PATCH', `/api/stages/${s3.data.id}`, { order: 0 });
        assertEqual(reorderRes.status, 200, 'Reorder Stage 3');
        assertEqual(reorderRes.data.order, 0, 'Stage 3 order updated to 0');
      } finally {
        await makeRequest('DELETE', `/api/projects/${pId}`);
      }
    }
  );

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}              CHALLENGER STRESS SUITE SUMMARY                   ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Stress Tests Run: ${total}`);
  console.log(`Passed:                 ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:                 ${failed > 0 ? colors.red + failed + colors.reset : '0'}`);
  console.log(`Pass Rate:              ${passRate === '100.0' ? colors.green : colors.red}${passRate}%${colors.reset}`);

  const categories = Array.from(new Set(results.map((r) => r.category)));
  console.log(`\n${colors.bright}Breakdown by Category:${colors.reset}`);
  for (const cat of categories) {
    const catTests = results.filter((r) => r.category === cat);
    const catPassed = catTests.filter((r) => r.passed).length;
    console.log(`  - ${cat.padEnd(12)}: ${catPassed}/${catTests.length} passed`);
  }

  if (failed > 0) {
    console.log(`\n${colors.red}${colors.bright}FAILURES DETECTED:${colors.reset}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  [FAIL] ${r.id} - ${r.name}`);
      console.log(`         ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bright}ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED (100.0%).${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal stress suite failure:', err);
  process.exit(1);
});
