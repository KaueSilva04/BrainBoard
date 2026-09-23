/**
 * BrainBoard V2 - Challenger Live E2E Stress & Protocol Verification Suite
 * (tests/challenger_live_sse_mcp_test.ts)
 * 
 * Objectives:
 * 1. MCP SSE Protocol Fidelity & Handshake Verification
 * 2. Full Execution of ALL 15 Registered MCP Tools over Live SSE
 * 3. Multi-Client SSE Session Handling, Isolation & Zero Cross-Talk
 * 4. Dual REST/MCP Bidirectional Synchronization & Concurrency Consistency
 * 5. Transport Lifecycle, Session Cleanup & Leak Resilience
 * 6. Adversarial JSON-RPC Boundary Stress & Malformed Payload Handling
 * 
 * Zero external dependencies: Relies strictly on Node.js core modules (http, url, crypto).
 */

import * as http from 'http';
import * as crypto from 'crypto';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} -> Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

async function runTest(
  id: string,
  category: string,
  name: string,
  fn: () => Promise<void>
) {
  const start = Date.now();
  process.stdout.write(`  ${colors.cyan}[TEST]${colors.reset} ${colors.bright}${id}${colors.reset} - ${name}... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ id, name, category, status: 'PASSED', durationMs });
    console.log(`${colors.green}✓ PASS${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errorMsg = err?.message || String(err);
    testResults.push({ id, name, category, status: 'FAILED', durationMs, error: errorMsg });
    console.log(`${colors.red}✗ FAIL${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.log(`    ${colors.red}Error: ${errorMsg}${colors.reset}`);
  }
}

// REST helper using Node http
function makeRestRequest(
  method: string,
  path: string,
  body?: any,
  timeoutMs = 8000
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const postData = body !== undefined ? JSON.stringify(body) : null;
    const headers: http.OutgoingHttpHeaders = {
      Accept: 'application/json',
    };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
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
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data: any = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, data });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`REST ${method} ${path} timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Robust Adversarial MCP SSE Client
class AdversarialMcpSseClient {
  public clientId: string;
  public sessionId: string | null = null;
  public messagePath: string | null = null;
  public initialHeaders: http.IncomingHttpHeaders | null = null;
  private req: http.ClientRequest | null = null;
  private res: http.IncomingMessage | null = null;
  private buffer = '';
  private currentEvent = '';
  private currentData: string[] = [];
  public isConnected = false;
  public pendingRequests = new Map<
    string | number,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }
  >();
  public receivedResponseIds = new Set<string | number>();
  public crossTalkViolations: any[] = [];
  public sentRequestIds = new Set<string | number>();
  private nextId = 1;

  constructor(clientId = 'McpClient') {
    this.clientId = clientId;
  }

  async connect(timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.close();
        reject(new Error(`[${this.clientId}] SSE handshake timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const url = new URL('/mcp/sse', BACKEND_URL);
      this.req = http.request(
        url,
        {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
        (res) => {
          this.res = res;
          this.initialHeaders = res.headers;

          if (res.statusCode !== 200) {
            clearTimeout(timer);
            this.close();
            return reject(
              new Error(`[${this.clientId}] SSE connection failed with status ${res.statusCode}`)
            );
          }

          res.on('data', (chunk: Buffer) => {
            this.buffer += chunk.toString();
            this.processBuffer((endpointUrl) => {
              if (!this.isConnected) {
                this.isConnected = true;
                clearTimeout(timer);
                const parsed = new URL(endpointUrl, BACKEND_URL);
                this.messagePath = parsed.pathname + parsed.search;
                this.sessionId = parsed.searchParams.get('sessionId');
                resolve();
              }
            });
          });

          res.on('error', (err) => {
            clearTimeout(timer);
            if (!this.isConnected) reject(err);
          });
        }
      );

      this.req.on('error', (err) => {
        clearTimeout(timer);
        if (!this.isConnected) reject(err);
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
            const msgId = message.id;

            if (msgId !== undefined) {
              this.receivedResponseIds.add(msgId);
              if (this.pendingRequests.has(msgId)) {
                const { resolve, reject, timer } = this.pendingRequests.get(msgId)!;
                clearTimeout(timer);
                this.pendingRequests.delete(msgId);
                if (message.error) {
                  reject(new Error(message.error.message || JSON.stringify(message.error)));
                } else {
                  resolve(message.result);
                }
              } else {
                // Received response for an ID this client did NOT send or already closed
                if (!this.sentRequestIds.has(msgId)) {
                  this.crossTalkViolations.push(message);
                }
              }
            }
          } catch {
            // Malformed chunk or partial
          }
        }
        this.currentEvent = '';
        this.currentData = [];
      }
    }
  }

  async listTools(customId?: string | number, timeoutMs = 8000): Promise<any> {
    const id = customId !== undefined ? customId : `${this.clientId}-tools-${this.nextId++}`;
    this.sentRequestIds.add(id);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`[${this.clientId}] tools/list timed out after ${timeoutMs}ms (id: ${id})`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      this.sendPostPayload({
        jsonrpc: '2.0',
        id,
        method: 'tools/list',
        params: {},
      }).catch((err) => {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  async callTool(
    name: string,
    args: Record<string, any> = {},
    customId?: string | number,
    timeoutMs = 8000
  ): Promise<any> {
    const id = customId !== undefined ? customId : `${this.clientId}-call-${name}-${this.nextId++}`;
    this.sentRequestIds.add(id);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(`[${this.clientId}] callTool '${name}' timed out after ${timeoutMs}ms (id: ${id})`)
        );
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      this.sendPostPayload({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name, arguments: args },
      }).catch((err) => {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  async sendRawPost(
    payloadString: string,
    overrideSessionId?: string,
    timeoutMs = 5000
  ): Promise<{ status: number; body: string }> {
    const targetSession = overrideSessionId !== undefined ? overrideSessionId : this.sessionId;
    const postPath = targetSession ? `/mcp/messages?sessionId=${targetSession}` : '/mcp/messages';
    const postUrl = new URL(postPath, BACKEND_URL);

    return new Promise((resolve, reject) => {
      const req = http.request(
        postUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadString),
          },
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode || 0, body }));
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`sendRawPost timed out after ${timeoutMs}ms`));
      });
      req.on('error', reject);
      req.write(payloadString);
      req.end();
    });
  }

  private async sendPostPayload(payload: any): Promise<void> {
    if (!this.sessionId || !this.messagePath) {
      throw new Error(`[${this.clientId}] MCP client is not connected`);
    }

    const postPayload = JSON.stringify(payload);
    const postUrl = new URL(this.messagePath, BACKEND_URL);

    return new Promise((resolve, reject) => {
      const postReq = http.request(
        postUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postPayload),
          },
        },
        (res) => {
          if (res.statusCode !== 200 && res.statusCode !== 202) {
            let errBody = '';
            res.on('data', (c) => (errBody += c));
            res.on('end', () => {
              reject(
                new Error(
                  `[${this.clientId}] POST /mcp/messages returned HTTP ${res.statusCode}: ${errBody}`
                )
              );
            });
            return;
          }
          resolve();
        }
      );

      postReq.on('error', reject);
      postReq.write(postPayload);
      postReq.end();
    });
  }

  close() {
    this.isConnected = false;
    for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
      clearTimeout(timer);
      reject(new Error(`[${this.clientId}] Client closed connection (pending id: ${id})`));
    }
    this.pendingRequests.clear();
    try {
      this.req?.destroy();
      this.res?.destroy();
    } catch {}
    this.req = null;
    this.res = null;
    this.sessionId = null;
    this.messagePath = null;
  }
}

// ---------------------------------------------------------------------------
// TEST EXECUTION SUITE
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  BrainBoard V2 - Challenger Live E2E Stress & Protocol Suite  ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.dim}Backend URL: ${colors.reset}${BACKEND_URL}`);
  console.log(`${colors.dim}Execution Mode: EMPIRICAL LIVE PROTOCOL & CONCURRENCY VERIFICATION${colors.reset}\n`);

  // Shared test fixture IDs
  let suiteProjectId = '';
  let suiteStageId = '';
  let suiteTaskId = '';
  let suiteSubtaskId = '';
  let mcpTask1Id = '';
  let mcpTask2Id = '';
  let mcpSubtaskId = '';

  // -------------------------------------------------------------------------
  // GROUP 1: MCP SSE Protocol Fidelity & Handshake
  // -------------------------------------------------------------------------
  console.log(`${colors.magenta}${colors.bright}--- GROUP 1: MCP SSE PROTOCOL FIDELITY & HANDSHAKE ---${colors.reset}`);

  const primaryClient = new AdversarialMcpSseClient('PrimaryClient');

  await runTest(
    'PROT-01',
    'PROTOCOL_FIDELITY',
    'SSE Handshake Headers & Endpoint Event Conformance',
    async () => {
      await primaryClient.connect(5000);
      assert(primaryClient.isConnected, 'SSE client must be connected');
      assert(!!primaryClient.sessionId, 'SessionId must be assigned');
      assert(
        /^[0-9a-f-]{36}$/i.test(primaryClient.sessionId!),
        `Session ID must be valid UUID format, got: ${primaryClient.sessionId}`
      );

      const headers = primaryClient.initialHeaders!;
      const contentType = headers['content-type'] || '';
      assert(
        contentType.includes('text/event-stream'),
        `Content-Type must be text/event-stream, got: ${contentType}`
      );
    }
  );

  await runTest(
    'PROT-02',
    'PROTOCOL_FIDELITY',
    'POST /mcp/messages Non-Existent Session Returns 404',
    async () => {
      const fakeSessionId = '11111111-2222-3333-4444-555555555555';
      const res = await primaryClient.sendRawPost(
        JSON.stringify({ jsonrpc: '2.0', id: 'fake-test', method: 'tools/list' }),
        fakeSessionId
      );
      assertEqual(res.status, 404, 'Non-existent session must return 404 Not Found');
      const bodyObj = JSON.parse(res.body);
      assertEqual(bodyObj.error, 'MCP session not found', 'Must return MCP session not found error');
    }
  );

  await runTest(
    'PROT-03',
    'PROTOCOL_FIDELITY',
    'MCP tools/list Discovery Handshake Enumerates Exactly 15 Tools',
    async () => {
      const listRes = await primaryClient.listTools();
      assert(listRes && Array.isArray(listRes.tools), 'tools/list must return tools array');
      assertEqual(listRes.tools.length, 15, 'Must contain exactly 15 registered tools');

      const expectedTools = [
        'read_project_context',
        'update_business_logic',
        'update_project_settings',
        'log_project_update',
        'create_task',
        'add_task',
        'move_task',
        'update_task_status',
        'add_subtask',
        'toggle_subtask',
        'update_task',
        'delete_task',
        'delete_subtask',
        'list_tasks',
        'get_task',
      ];

      const returnedNames = listRes.tools.map((t: any) => t.name);
      for (const expected of expectedTools) {
        assert(returnedNames.includes(expected), `Tool '${expected}' missing from tools/list!`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GROUP 2: Full Execution of ALL 15 MCP Tools Over Real Live SSE
  // -------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bright}--- GROUP 2: EXECUTION OF ALL 15 MCP TOOLS OVER LIVE SSE ---${colors.reset}`);

  // Create base Project and Stage via REST for tools testing
  await runTest('SETUP-FIXTURE', 'FIXTURE', 'Create Baseline Project & Stage for Tool Verification', async () => {
    const pRes = await makeRestRequest('POST', '/api/projects', {
      title: 'MCP 15 Tools Empirical Test Target',
      description: 'Challenger verification target for all 15 MCP tools',
      businessLogic: '# Baseline Business Logic\n\nInitial verification rules.',
      status: 'PLANNING',
    });
    assertEqual(pRes.status, 201, 'Project creation must return 201');
    suiteProjectId = pRes.data.id;

    const sRes = await makeRestRequest('POST', `/api/projects/${suiteProjectId}/stages`, {
      title: 'MCP Verification Stage',
      status: 'IN_PROGRESS',
    });
    assertEqual(sRes.status, 201, 'Stage creation must return 201');
    suiteStageId = sRes.data.id;
  });

  // Tool 1: read_project_context
  await runTest('TOOL-01', 'ALL_15_TOOLS', 'read_project_context returns comprehensive project structure', async () => {
    const res = await primaryClient.callTool('read_project_context', { projectId: suiteProjectId });
    assert(res && res.content && res.content[0]?.text, 'read_project_context must return text content');
    const project = JSON.parse(res.content[0].text);
    assertEqual(project.id, suiteProjectId, 'Returned project id must match');
    assert(Array.isArray(project.stages), 'Project must have stages array');
    assert(project.stages.some((s: any) => s.id === suiteStageId), 'Created stage must be present in context');
  });

  // Tool 2: update_business_logic
  await runTest('TOOL-02', 'ALL_15_TOOLS', 'update_business_logic updates project markdown logic', async () => {
    const newBL = '# Updated Business Logic via MCP\n\n- Empirical verification rule 1\n- Rule 2';
    const res = await primaryClient.callTool('update_business_logic', {
      projectId: suiteProjectId,
      businessLogic: newBL,
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    assert(res.content[0].text.includes('atualizada com sucesso'), 'Text confirms update');

    // Confirm via REST
    const check = await makeRestRequest('GET', `/api/projects/${suiteProjectId}`);
    assertEqual(check.data.businessLogic, newBL, 'Database reflects updated business logic');
  });

  // Tool 3: update_project_settings
  await runTest('TOOL-03', 'ALL_15_TOOLS', 'update_project_settings updates repo and dynamic JSON settings', async () => {
    const githubRepo = 'https://github.com/brainboard/challenger-live-test';
    const settings = { challengerMode: true, maxConcurrency: 10, aiProvider: 'gemini-2.5-pro' };
    const res = await primaryClient.callTool('update_project_settings', {
      projectId: suiteProjectId,
      githubRepo,
      settings,
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');

    // Confirm via REST
    const check = await makeRestRequest('GET', `/api/projects/${suiteProjectId}`);
    assertEqual(check.data.githubRepo, githubRepo, 'Database reflects updated githubRepo');
    assertEqual(check.data.settings.aiProvider, 'gemini-2.5-pro', 'Database reflects dynamic settings');
  });

  // Tool 4: log_project_update
  await runTest('TOOL-04', 'ALL_15_TOOLS', 'log_project_update writes rich markdown update log', async () => {
    const title = 'Challenger Live Update Log';
    const content = '# Daily Log\n\n- Tested 15 tools\n- Verified zero leaks';
    const author = 'Empirical Challenger 2';
    const res = await primaryClient.callTool('log_project_update', {
      projectId: suiteProjectId,
      title,
      content,
      author,
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    assert(res.content[0].text.includes('Log de atualiza'), 'Text confirms log creation');

    // Confirm via REST
    const logsRes = await makeRestRequest('GET', `/api/projects/${suiteProjectId}/update-logs`);
    const foundLog = logsRes.data.find((l: any) => l.title === title);
    assert(!!foundLog, 'Created update log must be found in database');
    assertEqual(foundLog.author, author, 'Author matches');
  });

  // Tool 5: create_task
  await runTest('TOOL-05', 'ALL_15_TOOLS', 'create_task adds task to stage', async () => {
    const res = await primaryClient.callTool('create_task', {
      stageId: suiteStageId,
      title: 'MCP Task Alpha',
      description: 'Created with tool create_task',
      status: 'TODO',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    mcpTask1Id = res.content[0].text.split(':').pop().trim();
    assert(mcpTask1Id.length > 0, 'Created task ID must be extracted');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    assertEqual(check.status, 200, 'Created task must exist in REST');
    assertEqual(check.data.title, 'MCP Task Alpha', 'Task title matches');
  });

  // Tool 6: add_task (alias)
  await runTest('TOOL-06', 'ALL_15_TOOLS', 'add_task (alias) adds task to stage', async () => {
    const res = await primaryClient.callTool('add_task', {
      stageId: suiteStageId,
      title: 'MCP Task Beta (Alias)',
      description: 'Created with tool add_task',
      status: 'TODO',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    mcpTask2Id = res.content[0].text.split(':').pop().trim();
    assert(mcpTask2Id.length > 0, 'Created task ID must be extracted');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask2Id}`);
    assertEqual(check.status, 200, 'Created task must exist in REST');
    assertEqual(check.data.title, 'MCP Task Beta (Alias)', 'Task title matches');
  });

  // Tool 7: move_task
  await runTest('TOOL-07', 'ALL_15_TOOLS', 'move_task updates task status to IN_PROGRESS', async () => {
    const res = await primaryClient.callTool('move_task', {
      id: mcpTask1Id,
      status: 'IN_PROGRESS',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    assert(res.content[0].text.includes('IN_PROGRESS'), 'Confirmation includes new status');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    assertEqual(check.data.status, 'IN_PROGRESS', 'REST reflects moved task status');
  });

  // Tool 8: update_task_status (alias)
  await runTest('TOOL-08', 'ALL_15_TOOLS', 'update_task_status (alias) updates task status to DONE', async () => {
    const res = await primaryClient.callTool('update_task_status', {
      id: mcpTask2Id,
      status: 'DONE',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    assert(res.content[0].text.includes('DONE'), 'Confirmation includes new status');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask2Id}`);
    assertEqual(check.data.status, 'DONE', 'REST reflects updated task status');
  });

  // Tool 9: add_subtask
  await runTest('TOOL-09', 'ALL_15_TOOLS', 'add_subtask attaches subtask to task', async () => {
    const res = await primaryClient.callTool('add_subtask', {
      taskId: mcpTask1Id,
      title: 'Inspect wire protocol',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');
    mcpSubtaskId = res.content[0].text.split(':').pop().trim();
    assert(mcpSubtaskId.length > 0, 'Subtask ID must be extracted');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    assert(check.data.subtasks.some((st: any) => st.id === mcpSubtaskId), 'Subtask attached in DB');
  });

  // Tool 10: toggle_subtask
  await runTest('TOOL-10', 'ALL_15_TOOLS', 'toggle_subtask toggles isDone state', async () => {
    const resTrue = await primaryClient.callTool('toggle_subtask', {
      id: mcpSubtaskId,
      isDone: true,
    });
    assert(resTrue && resTrue.content && resTrue.content[0]?.text, 'Must return confirmation text');
    assert(resTrue.content[0].text.includes('conclu'), 'Subtask marked completed');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    const st = check.data.subtasks.find((s: any) => s.id === mcpSubtaskId);
    assertEqual(st.isDone, true, 'Database confirms subtask isDone = true');
  });

  // Tool 11: update_task
  await runTest('TOOL-11', 'ALL_15_TOOLS', 'update_task updates title and description', async () => {
    const res = await primaryClient.callTool('update_task', {
      id: mcpTask1Id,
      title: 'MCP Task Alpha Renamed',
      description: 'Updated description through update_task tool',
    });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    assertEqual(check.data.title, 'MCP Task Alpha Renamed', 'Title updated');
    assertEqual(check.data.description, 'Updated description through update_task tool', 'Description updated');
  });

  // Tool 12: get_task
  await runTest('TOOL-12', 'ALL_15_TOOLS', 'get_task returns full task details with nested subtasks', async () => {
    const res = await primaryClient.callTool('get_task', { id: mcpTask1Id });
    assert(res && res.content && res.content[0]?.text, 'Must return JSON string');
    const taskObj = JSON.parse(res.content[0].text);
    assertEqual(taskObj.id, mcpTask1Id, 'Returned task ID matches');
    assertEqual(taskObj.title, 'MCP Task Alpha Renamed', 'Returned title matches');
    assert(Array.isArray(taskObj.subtasks), 'Subtasks array present');
    assertEqual(taskObj.subtasks.length, 1, 'Contains 1 subtask');
    assertEqual(taskObj.subtasks[0].id, mcpSubtaskId, 'Subtask ID matches');
  });

  // Tool 13: list_tasks
  await runTest('TOOL-13', 'ALL_15_TOOLS', 'list_tasks returns tasks filtered by stageId and status', async () => {
    const resAll = await primaryClient.callTool('list_tasks', { stageId: suiteStageId });
    assert(resAll && resAll.content && resAll.content[0]?.text, 'Must return JSON list');
    const tasksAll = JSON.parse(resAll.content[0].text);
    assert(tasksAll.length >= 2, 'Should return at least 2 tasks');

    const resInProgress = await primaryClient.callTool('list_tasks', {
      stageId: suiteStageId,
      status: 'IN_PROGRESS',
    });
    const tasksInProgress = JSON.parse(resInProgress.content[0].text);
    assert(tasksInProgress.every((t: any) => t.status === 'IN_PROGRESS'), 'All tasks must be IN_PROGRESS');
  });

  // Tool 14: delete_subtask
  await runTest('TOOL-14', 'ALL_15_TOOLS', 'delete_subtask removes subtask', async () => {
    const res = await primaryClient.callTool('delete_subtask', { id: mcpSubtaskId });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask1Id}`);
    assert(!check.data.subtasks.some((st: any) => st.id === mcpSubtaskId), 'Subtask no longer present in task');
  });

  // Tool 15: delete_task
  await runTest('TOOL-15', 'ALL_15_TOOLS', 'delete_task removes task', async () => {
    const res = await primaryClient.callTool('delete_task', { id: mcpTask2Id });
    assert(res && res.content && res.content[0]?.text, 'Must return confirmation text');

    const check = await makeRestRequest('GET', `/api/tasks/${mcpTask2Id}`);
    assertEqual(check.status, 404, 'Task should now return 404 Not Found');
  });

  // -------------------------------------------------------------------------
  // GROUP 3: Multi-Client Session Handling & Isolation
  // -------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bright}--- GROUP 3: MULTI-CLIENT SESSION HANDLING & ISOLATION ---${colors.reset}`);

  const NUM_CLIENTS = 5;
  const multiClients: AdversarialMcpSseClient[] = [];

  await runTest(
    'MULTI-01',
    'MULTI_CLIENT_SESSIONS',
    `Establish ${NUM_CLIENTS} Simultaneous SSE Clients with Unique Session IDs`,
    async () => {
      const connectPromises: Promise<void>[] = [];
      for (let i = 1; i <= NUM_CLIENTS; i++) {
        const client = new AdversarialMcpSseClient(`ConcurrentClient-${i}`);
        multiClients.push(client);
        connectPromises.push(client.connect(6000));
      }

      await Promise.all(connectPromises);

      const sessionIds = new Set<string>();
      for (const client of multiClients) {
        assert(client.isConnected, `${client.clientId} must be connected`);
        assert(!!client.sessionId, `${client.clientId} must have a session ID`);
        assert(!sessionIds.has(client.sessionId!), `Duplicate session ID detected: ${client.sessionId}`);
        sessionIds.add(client.sessionId!);
      }
      assertEqual(sessionIds.size, NUM_CLIENTS, `Must have ${NUM_CLIENTS} distinct session IDs`);
    }
  );

  await runTest(
    'MULTI-02',
    'MULTI_CLIENT_SESSIONS',
    'Concurrent tools/list Discovery Handshake Across All Sessions',
    async () => {
      const promises = multiClients.map((client, idx) =>
        client.listTools(`multi-list-${client.clientId}-${idx}`)
      );
      const results = await Promise.all(promises);

      assertEqual(results.length, NUM_CLIENTS, 'All clients must receive tools/list');
      for (const res of results) {
        assertEqual(res.tools.length, 15, 'Each client must receive all 15 tools');
      }
    }
  );

  await runTest(
    'MULTI-03',
    'MULTI_CLIENT_SESSIONS',
    'High-Throughput Concurrent Burst (25 In-Flight Calls: 5 Clients x 5 Calls) & Strict Zero Cross-Talk',
    async () => {
      const burstPromises: Promise<any>[] = [];

      for (let i = 0; i < NUM_CLIENTS; i++) {
        const client = multiClients[i];
        const cNum = i + 1;

        // Call 1: read_project_context
        burstPromises.push(
          client.callTool(
            'read_project_context',
            { projectId: suiteProjectId },
            `burst-c${cNum}-read-ctx`
          )
        );

        // Call 2: create_task
        burstPromises.push(
          client.callTool(
            'create_task',
            {
              stageId: suiteStageId,
              title: `Burst Task from Client ${cNum}`,
              status: 'TODO',
            },
            `burst-c${cNum}-create-tsk`
          )
        );

        // Call 3: log_project_update
        burstPromises.push(
          client.callTool(
            'log_project_update',
            {
              projectId: suiteProjectId,
              title: `Burst Log Client ${cNum}`,
              content: `Concurrent log from stream ${cNum}`,
              author: `Agent ${cNum}`,
            },
            `burst-c${cNum}-log-upd`
          )
        );

        // Call 4: list_tasks
        burstPromises.push(
          client.callTool(
            'list_tasks',
            { stageId: suiteStageId },
            `burst-c${cNum}-list-tsk`
          )
        );

        // Call 5: update_business_logic
        burstPromises.push(
          client.callTool(
            'update_business_logic',
            {
              projectId: suiteProjectId,
              businessLogic: `# Concurrency BL Written by Client ${cNum}`,
            },
            `burst-c${cNum}-upd-bl`
          )
        );
      }

      const results = await Promise.all(burstPromises);
      assertEqual(results.length, 25, 'All 25 in-flight concurrent requests must succeed');

      // Check cross-talk
      let totalCrossTalk = 0;
      for (const client of multiClients) {
        if (client.crossTalkViolations.length > 0) {
          totalCrossTalk += client.crossTalkViolations.length;
        }
      }
      assertEqual(totalCrossTalk, 0, 'Zero cross-talk messages received across separate client SSE streams');

      // Check every client received responses for all sent IDs
      for (const client of multiClients) {
        for (const reqId of client.sentRequestIds) {
          assert(
            client.receivedResponseIds.has(reqId),
            `Client ${client.clientId} missing response for request ${reqId}`
          );
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // GROUP 4: Dual REST/MCP Bidirectional Synchronization
  // -------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bright}--- GROUP 4: DUAL REST/MCP BIDIRECTIONAL SYNCHRONIZATION ---${colors.reset}`);

  let syncProjectId = '';
  let syncStageId = '';
  let syncTaskId = '';
  let syncSubtaskId = '';

  await runTest(
    'SYNC-01',
    'DUAL_INTERFACE_SYNC',
    'Bidirectional Entity Mutation & Visibility Across REST and MCP',
    async () => {
      // Step 1: REST creates project and stage
      const pRes = await makeRestRequest('POST', '/api/projects', {
        title: 'Sync Verification Project',
        description: 'Testing bidirectional REST-MCP parity',
        status: 'ACTIVE',
      });
      syncProjectId = pRes.data.id;

      const sRes = await makeRestRequest('POST', `/api/projects/${syncProjectId}/stages`, {
        title: 'Sync Stage',
        status: 'PLANNING',
      });
      assertEqual(sRes.status, 201, 'Stage creation must return 201');
      syncStageId = sRes.data.id;

      // Step 2: MCP creates Task
      const mcpCreateRes = await primaryClient.callTool('create_task', {
        stageId: syncStageId,
        title: 'Task Created Via MCP',
        description: 'Mutated over SSE',
        status: 'TODO',
      });
      syncTaskId = mcpCreateRes.content[0].text.split(':').pop().trim();

      // Step 3: REST verifies task is immediately visible
      const restTask = await makeRestRequest('GET', `/api/tasks/${syncTaskId}`);
      assertEqual(restTask.status, 200, 'REST can immediately read MCP-created task');
      assertEqual(restTask.data.title, 'Task Created Via MCP', 'Task title matches in REST');

      // Step 4: REST mutates task status to IN_PROGRESS
      const restPatch = await makeRestRequest('PATCH', `/api/tasks/${syncTaskId}`, {
        status: 'IN_PROGRESS',
      });
      assertEqual(restPatch.status, 200, 'REST update successful');

      // Step 5: MCP reads task details via get_task and verifies updated status
      const mcpGetTask = await primaryClient.callTool('get_task', { id: syncTaskId });
      const mcpTaskObj = JSON.parse(mcpGetTask.content[0].text);
      assertEqual(mcpTaskObj.status, 'IN_PROGRESS', 'MCP get_task reflects REST status mutation');

      // Step 6: MCP adds subtask
      const mcpSubRes = await primaryClient.callTool('add_subtask', {
        taskId: syncTaskId,
        title: 'Subtask from MCP',
      });
      syncSubtaskId = mcpSubRes.content[0].text.split(':').pop().trim();

      // Step 7: REST toggles subtask to done
      const restSubPatch = await makeRestRequest('PATCH', `/api/subtasks/${syncSubtaskId}`, {
        isDone: true,
      });
      assertEqual(restSubPatch.status, 200, 'REST toggles subtask');

      // Step 8: MCP read_project_context verifies full hierarchy
      const mcpCtx = await primaryClient.callTool('read_project_context', { projectId: syncProjectId });
      const ctxObj = JSON.parse(mcpCtx.content[0].text);
      const stageInCtx = ctxObj.stages.find((st: any) => st.id === syncStageId);
      assert(!!stageInCtx, 'Stage found in MCP context');
      const taskInCtx = stageInCtx.tasks.find((t: any) => t.id === syncTaskId);
      assert(!!taskInCtx, 'Task found in MCP context');
      const subInCtx = taskInCtx.subtasks.find((s: any) => s.id === syncSubtaskId);
      assert(!!subInCtx, 'Subtask found in MCP context');
      assertEqual(subInCtx.isDone, true, 'Subtask toggle state visible in MCP context');
    }
  );

  await runTest(
    'SYNC-02',
    'DUAL_INTERFACE_SYNC',
    'Cascade Deletion Parity: REST Purge Reflects in MCP Context (Error on Purged Entity)',
    async () => {
      // Delete sync project via REST
      const delRes = await makeRestRequest('DELETE', `/api/projects/${syncProjectId}`);
      assertEqual(delRes.status, 204, 'Project deleted via REST');

      // Verify MCP read_project_context returns isError = true
      const mcpCtx = await primaryClient.callTool('read_project_context', { projectId: syncProjectId });
      assert(mcpCtx.isError === true, 'read_project_context on deleted project must report isError: true');

      // Verify MCP get_task returns isError = true
      const mcpGet = await primaryClient.callTool('get_task', { id: syncTaskId });
      assert(mcpGet.isError === true, 'get_task on cascade-deleted task must report isError: true');
    }
  );

  // -------------------------------------------------------------------------
  // GROUP 5: Transport Lifecycle & Leak Resilience
  // -------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bright}--- GROUP 5: TRANSPORT LIFECYCLE & LEAK RESILIENCE ---${colors.reset}`);

  await runTest(
    'LEAK-01',
    'TRANSPORT_LIFECYCLE',
    'Client Disconnect Purges Session from sseTransports (Immediate 404 on Subsequent Post)',
    async () => {
      const ephemeralClient = new AdversarialMcpSseClient('EphemeralClient');
      await ephemeralClient.connect(5000);
      assert(ephemeralClient.isConnected, 'Ephemeral client connected');
      const ephemeralSessionId = ephemeralClient.sessionId!;

      // Confirm session is valid
      const toolsRes = await ephemeralClient.listTools();
      assert(toolsRes.tools.length === 15, 'Session active and answering');

      // Close the client connection (disconnects SSE response stream)
      ephemeralClient.close();

      // Give server event loop 100ms to process close event
      await new Promise((r) => setTimeout(r, 100));

      // Attempt to send POST to the now-closed sessionId
      const postRes = await primaryClient.sendRawPost(
        JSON.stringify({ jsonrpc: '2.0', id: 'post-close-test', method: 'tools/list' }),
        ephemeralSessionId
      );

      assertEqual(postRes.status, 404, 'Post-disconnect message MUST return 404 Not Found');
      const errJson = JSON.parse(postRes.body);
      assertEqual(errJson.error, 'MCP session not found', 'Session map properly purged closed transport');
    }
  );

  await runTest(
    'LEAK-02',
    'TRANSPORT_LIFECYCLE',
    'High-Frequency Connection Churn (10 Sequential Connect & Disconnect Cycles Without Leaks)',
    async () => {
      for (let i = 1; i <= 10; i++) {
        const churnClient = new AdversarialMcpSseClient(`Churn-${i}`);
        await churnClient.connect(4000);
        assert(churnClient.isConnected, `Churn client ${i} connected`);
        // Disconnect immediately
        churnClient.close();
      }

      // Check backend health
      const health = await makeRestRequest('GET', '/api/health');
      assertEqual(health.status, 200, 'Backend /api/health responds normally after connection churn');
      assertEqual(health.data.status, 'ok', 'Status is ok');
    }
  );

  // Close multi-clients from Group 3
  for (const client of multiClients) {
    client.close();
  }

  // -------------------------------------------------------------------------
  // GROUP 6: Adversarial JSON-RPC Boundary Stress & Malformed Handling
  // -------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bright}--- GROUP 6: ADVERSARIAL JSON-RPC BOUNDARY STRESS ---${colors.reset}`);

  await runTest(
    'ADV-01',
    'ADVERSARIAL_JSONRPC',
    'Unknown Tool Call Returns Graceful Tool Error (Server Does Not Crash)',
    async () => {
      let threw = false;
      try {
        await primaryClient.callTool('completely_non_existent_tool_xyz', { foo: 'bar' });
      } catch (err: any) {
        threw = true;
        assert(
          err.message.includes('Tool unknown') || err.message.includes('unknown'),
          `Error must state unknown tool, got: ${err.message}`
        );
      }
      assert(threw, 'Calling unknown tool must throw JSON-RPC error');
    }
  );

  await runTest(
    'ADV-02',
    'ADVERSARIAL_JSONRPC',
    'Missing Required Tool Arguments Throws Explicit Validation Error',
    async () => {
      let threw = false;
      try {
        // create_task requires stageId and title
        await primaryClient.callTool('create_task', { title: 'Missing stageId' });
      } catch (err: any) {
        threw = true;
        assert(
          err.message.includes('stageId') || err.message.includes('obrigat'),
          `Error mentions missing stageId, got: ${err.message}`
        );
      }
      assert(threw, 'Missing stageId must reject with error');
    }
  );

  await runTest(
    'ADV-03',
    'ADVERSARIAL_JSONRPC',
    'Non-Existent Entity UUIDs Handled Gracefully with isError Representation',
    async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await primaryClient.callTool('get_task', { id: nonExistentUuid });
      assert(res.isError === true, 'Non-existent task ID must return isError: true');
      assert(
        res.content[0].text.includes('n') || res.content[0].text.includes('encontrado'),
        'Message states task not found'
      );
    }
  );

  await runTest(
    'ADV-04',
    'ADVERSARIAL_JSONRPC',
    'Massive Markdown Payload Stress (50KB String in update_business_logic)',
    async () => {
      const largeContent = '# Stress Architecture Rules\n\n' + 'Rule item: ' + 'A'.repeat(50000);
      const res = await primaryClient.callTool('update_business_logic', {
        projectId: suiteProjectId,
        businessLogic: largeContent,
      });
      assert(res && res.content && res.content[0]?.text, 'Should process large payload without truncation');

      // Verify DB content length via REST
      const verify = await makeRestRequest('GET', `/api/projects/${suiteProjectId}`);
      assertEqual(verify.data.businessLogic.length, largeContent.length, 'Full 50KB string preserved in DB');
    }
  );

  await runTest(
    'ADV-05',
    'ADVERSARIAL_JSONRPC',
    'Malformed JSON in POST /mcp/messages Handled by Express (400 Bad Request Without Crash)',
    async () => {
      const rawRes = await primaryClient.sendRawPost('{ malformed json string without closing bracket: 123');
      assertEqual(rawRes.status, 400, 'Malformed JSON payload returns 400 Bad Request');
      // Verify server is still alive
      const health = await makeRestRequest('GET', '/api/health');
      assertEqual(health.status, 200, 'Server remains healthy after malformed JSON');
    }
  );

  await runTest(
    'ADV-06',
    'ADVERSARIAL_JSONRPC',
    '10 Simultaneous Clients & 50 In-Flight Tool Calls (Scale Stress & Zero Dropped Packets)',
    async () => {
      const TEN_CLIENTS = 10;
      const stressClients: AdversarialMcpSseClient[] = [];
      const connectPromises = [];

      for (let i = 1; i <= TEN_CLIENTS; i++) {
        const client = new AdversarialMcpSseClient(`ScaleClient-${i}`);
        stressClients.push(client);
        connectPromises.push(client.connect(6000));
      }

      await Promise.all(connectPromises);

      // Fire 5 in-flight tool calls per client = 50 total simultaneous calls
      const calls: Promise<any>[] = [];
      for (let i = 0; i < TEN_CLIENTS; i++) {
        const cl = stressClients[i];
        for (let j = 1; j <= 5; j++) {
          calls.push(cl.callTool('read_project_context', { projectId: suiteProjectId }, `scale-c${i}-req${j}`));
        }
      }

      const results = await Promise.all(calls);
      assertEqual(results.length, 50, 'All 50 simultaneous calls across 10 clients completed successfully');

      // Verify zero dropped or lost messages
      for (const cl of stressClients) {
        assertEqual(cl.crossTalkViolations.length, 0, 'No cross-talk detected under 10-client load');
        cl.close();
      }
    }
  );

  // Clean up primary client and suite project
  primaryClient.close();
  if (suiteProjectId) {
    await makeRestRequest('DELETE', `/api/projects/${suiteProjectId}`);
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}                   CHALLENGER EXECUTION SUMMARY                 ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);

  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASSED').length;
  const failed = testResults.filter((r) => r.status === 'FAILED').length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Empirical Tests: ${total}`);
  console.log(`${colors.green}Passed:                ${passed}${colors.reset}`);
  console.log(`${failed > 0 ? colors.red : colors.dim}Failed:                ${failed}${colors.reset}`);
  console.log(`Pass Rate:             ${passRate}%\n`);

  // Group breakdown
  const categories = Array.from(new Set(testResults.map((r) => r.category)));
  for (const cat of categories) {
    const catTests = testResults.filter((r) => r.category === cat);
    const catPassed = catTests.filter((r) => r.status === 'PASSED').length;
    console.log(`  ${cat}: ${catPassed}/${catTests.length} (${((catPassed / catTests.length) * 100).toFixed(1)}%)`);
  }

  console.log('');
  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}VERDICT: REJECT - Empirical failures detected!${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}VERDICT: APPROVE - 100% Empirical pass across all stress tests!${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
