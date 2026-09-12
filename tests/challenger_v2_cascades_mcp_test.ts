import http from 'http';
import { PrismaClient } from '@prisma/client';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

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
  domain: 'CASCADE_INTEGRITY' | 'MCP_CONCURRENT_SSE';
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

async function runTest(
  id: string,
  domain: 'CASCADE_INTEGRITY' | 'MCP_CONCURRENT_SSE',
  name: string,
  fn: () => Promise<void>
) {
  const start = Date.now();
  process.stdout.write(`  Testing [${id}] ${name}... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ id, domain, name, status: 'PASSED', durationMs });
    console.log(`${colors.green}${colors.bright}PASS${colors.reset} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({ id, domain, name, status: 'FAILED', durationMs, error: err?.message || String(err) });
    console.log(`${colors.red}${colors.bright}FAIL${colors.reset} (${durationMs}ms)`);
    console.log(`    ${colors.red}Error: ${err?.message || String(err)}${colors.reset}`);
  }
}

function makeRequest(
  method: string,
  pathStr: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BACKEND_URL);
    const postData = body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          let parsedData: any = responseBody;
          if (res.headers['content-type']?.includes('application/json')) {
            try {
              parsedData = JSON.parse(responseBody);
            } catch {
              parsedData = responseBody;
            }
          }
          resolve({
            status: res.statusCode || 0,
            data: parsedData,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

class ConcurrentMcpClient {
  public clientId: string;
  public sessionId: string | null = null;
  public messagePath: string | null = null;
  public isConnected = false;

  private req: http.ClientRequest | null = null;
  private res: http.IncomingMessage | null = null;
  private buffer = '';
  private currentEvent = '';
  private currentData: string[] = [];

  public sentRequestIds = new Set<string | number>();
  public receivedResponseIds = new Set<string | number>();
  public crossTalkViolations: Array<{ receivedId: any; message: any }> = [];

  private pendingRequests = new Map<
    string | number,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
      timer: NodeJS.Timeout;
    }
  >();

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  async connect(timeoutMs = 8000): Promise<string> {
    return new Promise((resolve, reject) => {
      const sseUrl = new URL('/mcp/sse', BACKEND_URL);
      let resolved = false;

      const timer = setTimeout(() => {
        this.close();
        if (!resolved) {
          reject(new Error(`[${this.clientId}] MCP SSE connection timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.req = http.request(
        sseUrl,
        {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'User-Agent': `ConcurrentMcpClient-${this.clientId}`,
          },
        },
        (res) => {
          this.res = res;
          if (res.statusCode !== 200) {
            clearTimeout(timer);
            return reject(new Error(`[${this.clientId}] SSE connect HTTP ${res.statusCode}`));
          }

          res.on('data', (chunk: Buffer) => {
            this.buffer += chunk.toString();
            this.processBuffer((endpointUrl) => {
              if (!resolved) {
                resolved = true;
                this.isConnected = true;
                clearTimeout(timer);
                const parsed = new URL(endpointUrl, BACKEND_URL);
                this.messagePath = parsed.pathname + parsed.search;
                this.sessionId = parsed.searchParams.get('sessionId');
                resolve(this.sessionId!);
              }
            });
          });

          res.on('error', (err) => {
            clearTimeout(timer);
            if (!resolved) reject(err);
          });
        }
      );

      this.req.on('error', (err) => {
        clearTimeout(timer);
        if (!resolved) reject(err);
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

              if (!this.sentRequestIds.has(msgId)) {
                this.crossTalkViolations.push({ receivedId: msgId, message });
                console.error(
                  `\n${colors.red}${colors.bright}[CRITICAL CROSS-TALK VIOLATION]${colors.reset} Client ${this.clientId} received foreign message id: ${msgId}`
                );
              }

              if (this.pendingRequests.has(msgId)) {
                const { resolve, reject, timer } = this.pendingRequests.get(msgId)!;
                clearTimeout(timer);
                this.pendingRequests.delete(msgId);
                if (message.error) {
                  reject(new Error(message.error.message || JSON.stringify(message.error)));
                } else {
                  resolve(message.result);
                }
              }
            }
          } catch {
            // ignore non-JSON
          }
        }
        this.currentEvent = '';
        this.currentData = [];
      }
    }
  }

  async listTools(customId?: string | number, timeoutMs = 8000): Promise<any> {
    const id = customId ?? `${this.clientId}-tools-list-${Date.now()}`;
    return this.sendJsonRpc(id, 'tools/list', {}, timeoutMs);
  }

  async callTool(name: string, args: Record<string, any> = {}, customId?: string | number, timeoutMs = 12000): Promise<any> {
    const id = customId ?? `${this.clientId}-call-${name}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return this.sendJsonRpc(id, 'tools/call', { name, arguments: args }, timeoutMs);
  }

  private async sendJsonRpc(
    id: string | number,
    method: string,
    params: Record<string, any>,
    timeoutMs: number
  ): Promise<any> {
    if (!this.isConnected || !this.sessionId || !this.messagePath) {
      throw new Error(`[${this.clientId}] Client is not connected to MCP SSE`);
    }

    this.sentRequestIds.add(id);

    const postPayload = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`[${this.clientId}] Request '${id}' method '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const postUrl = new URL(this.messagePath!, BACKEND_URL);
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
          if (res.statusCode !== 202 && res.statusCode !== 200) {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
              clearTimeout(timer);
              this.pendingRequests.delete(id);
              reject(new Error(`[${this.clientId}] POST /mcp/messages returned HTTP ${res.statusCode}: ${body}`));
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
    this.isConnected = false;
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      this.pendingRequests.delete(id);
    }
    if (this.req) {
      this.req.destroy();
      this.req = null;
    }
    if (this.res) {
      this.res.destroy();
      this.res = null;
    }
  }
}

async function runChallengerVerification() {
  console.log(`${colors.cyan}${colors.bright}=========================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright} Challenger V2: Multi-Level Cascade & Concurrent MCP Protocol Harness   ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=========================================================================${colors.reset}`);
  console.log(`${colors.dim}Backend URL:  ${colors.reset}${BACKEND_URL}`);
  console.log(`${colors.dim}Database:     ${colors.reset}Neon PostgreSQL via Prisma Client\n`);

  console.log(`${colors.magenta}${colors.bright}--- [DOMAIN 1] MULTI-LEVEL CASCADE DELETION VERIFICATION ---${colors.reset}`);

  let cascadeProjectId = '';
  const stageIds: string[] = [];
  const taskIds: string[] = [];
  const subtaskIds: string[] = [];
  const updateLogIds: string[] = [];
  const memberIds: string[] = [];

  let stage1Id = '';
  const stage1TaskIds: string[] = [];
  const stage1SubtaskIds: string[] = [];

  const siblingStageIds: string[] = [];
  const siblingTaskIds: string[] = [];
  const siblingSubtaskIds: string[] = [];

  await runTest(
    'CHAL-CAS-01',
    'CASCADE_INTEGRITY',
    'Construct Complete Entity Hierarchy (1 Project -> 3 Stages -> 6 Tasks -> 12 Subtasks, 4 Logs, 3 Members)',
    async () => {
      const pRes = await makeRequest('POST', '/api/projects', {
        title: 'Challenger V2 Multi-Level Cascade Stress Project',
        description: 'Empirical verification of cascade deletion across 6 interconnected models',
        businessLogic: '# Cascade Test Architecture\n\nFull graph hierarchy testing onDelete: Cascade',
        status: 'PLANNING',
        githubRepo: 'https://github.com/brainboard/cascade-integrity-test',
        settings: { testSuite: 'ChallengerV2', depth: 4, zeroOrphanRule: true },
      });
      assert(pRes.status === 201, `Failed to create root project, got HTTP ${pRes.status}`);
      cascadeProjectId = pRes.data.id;
      assert(Boolean(cascadeProjectId), 'Project id must be defined');

      for (let s = 0; s < 3; s++) {
        const stageStatus = s === 0 ? 'PLANNING' : s === 1 ? 'IN_PROGRESS' : 'COMPLETED';
        const sRes = await makeRequest('POST', `/api/projects/${cascadeProjectId}/stages`, {
          title: `Cascade Stage ${s + 1} (${s === 0 ? 'Stage-Alpha-Target' : `Sibling-${s}`})`,
          order: s,
          status: stageStatus,
        });
        assert(sRes.status === 201, `Failed to create Stage ${s + 1}: ${sRes.status}`);
        const sId = sRes.data.id;
        stageIds.push(sId);

        if (s === 0) {
          stage1Id = sId;
        } else {
          siblingStageIds.push(sId);
        }

        for (let t = 0; t < 2; t++) {
          const taskStatus = t === 0 ? 'TODO' : 'IN_PROGRESS';
          const tRes = await makeRequest('POST', `/api/stages/${sId}/tasks`, {
            title: `Task ${s + 1}.${t + 1} (Stage ${s + 1})`,
            description: `Task in stage ${sId}`,
            status: taskStatus,
          });
          assert(tRes.status === 201, `Failed to create Task ${s + 1}.${t + 1}: ${tRes.status}`);
          const tId = tRes.data.id;
          taskIds.push(tId);

          if (s === 0) {
            stage1TaskIds.push(tId);
          } else {
            siblingTaskIds.push(tId);
          }

          for (let sub = 0; sub < 2; sub++) {
            const subRes = await makeRequest('POST', `/api/tasks/${tId}/subtasks`, {
              title: `Subtask ${s + 1}.${t + 1}.${sub + 1}`,
            });
            assert(subRes.status === 201, `Failed to create Subtask: ${subRes.status}`);
            const subId = subRes.data.id;
            subtaskIds.push(subId);

            if (s === 0) {
              stage1SubtaskIds.push(subId);
            } else {
              siblingSubtaskIds.push(subId);
            }
          }
        }
      }

      const logTitles = [
        'Milestone Alpha Initialization',
        'Midterm Architecture Review',
        'Pre-Deletion Snapshot Audit',
        'Final Cascade Verification Checkpoint',
      ];
      for (let i = 0; i < 4; i++) {
        const lRes = await makeRequest('POST', `/api/projects/${cascadeProjectId}/update-logs`, {
          title: logTitles[i],
          content: `# Update Log Entry ${i + 1}\n\nRecording cascade status checkpoint ${i + 1}.`,
          author: `Agent Challenger V2.${i + 1}`,
        });
        assert(lRes.status === 201, `Failed to create UpdateLog ${i + 1}: ${lRes.status}`);
        updateLogIds.push(lRes.data.id);
      }

      const membersData = [
        { name: 'Ada Lovelace', role: 'Chief Systems Architect', email: 'ada@brainboard.cascade' },
        { name: 'Alan Turing', role: 'Verification Scientist', email: 'alan@brainboard.cascade' },
        { name: 'Grace Hopper', role: 'Runtime Quality Lead', email: 'grace@brainboard.cascade' },
      ];
      for (const m of membersData) {
        const mRes = await makeRequest('POST', `/api/projects/${cascadeProjectId}/members`, m);
        assert(mRes.status === 201, `Failed to create Member ${m.name}: ${mRes.status}`);
        memberIds.push(mRes.data.id);
      }

      assertEqual(stageIds.length, 3, 'Must have created exactly 3 stages');
      assertEqual(taskIds.length, 6, 'Must have created exactly 6 tasks');
      assertEqual(subtaskIds.length, 12, 'Must have created exactly 12 subtasks');
      assertEqual(updateLogIds.length, 4, 'Must have created exactly 4 update logs');
      assertEqual(memberIds.length, 3, 'Must have created exactly 3 members');
    }
  );

  await runTest(
    'CHAL-CAS-02',
    'CASCADE_INTEGRITY',
    'Empirical DB Count Verification (Direct Neon PostgreSQL via Prisma Client)',
    async () => {
      const dbProjectCount = await prisma.project.count({ where: { id: cascadeProjectId } });
      const dbStageCount = await prisma.stage.count({ where: { projectId: cascadeProjectId } });
      const dbTaskCount = await prisma.task.count({ where: { stageId: { in: stageIds } } });
      const dbSubtaskCount = await prisma.subtask.count({ where: { taskId: { in: taskIds } } });
      const dbLogCount = await prisma.updateLog.count({ where: { projectId: cascadeProjectId } });
      const dbMemberCount = await prisma.member.count({ where: { projectId: cascadeProjectId } });

      assertEqual(dbProjectCount, 1, 'Neon DB Project count');
      assertEqual(dbStageCount, 3, 'Neon DB Stage count');
      assertEqual(dbTaskCount, 6, 'Neon DB Task count');
      assertEqual(dbSubtaskCount, 12, 'Neon DB Subtask count');
      assertEqual(dbLogCount, 4, 'Neon DB UpdateLog count');
      assertEqual(dbMemberCount, 3, 'Neon DB Member count');

      const detailRes = await makeRequest('GET', `/api/projects/${cascadeProjectId}`);
      assertEqual(detailRes.status, 200, 'REST project detail must be 200');
      assertEqual(detailRes.data.stages.length, 3, 'REST project detail stages length');
      assertEqual(detailRes.data.updateLogs.length, 4, 'REST project detail updateLogs length');
      assertEqual(detailRes.data.members.length, 3, 'REST project detail members length');
    }
  );

  await runTest(
    'CHAL-CAS-03',
    'CASCADE_INTEGRITY',
    'Stage Deletion Cascade: Purges Stage 1 Tasks & Subtasks; Siblings & Project Remain 100% Intact',
    async () => {
      const delStageRes = await makeRequest('DELETE', `/api/stages/${stage1Id}`);
      assert(
        delStageRes.status === 204 || delStageRes.status === 200,
        `Expected 204/200 on DELETE stage, got ${delStageRes.status}`
      );

      const s1DbCount = await prisma.stage.count({ where: { id: stage1Id } });
      assertEqual(s1DbCount, 0, 'Stage 1 must be deleted from Neon DB');

      const s1TasksDbCount = await prisma.task.count({ where: { id: { in: stage1TaskIds } } });
      assertEqual(s1TasksDbCount, 0, 'Stage 1 tasks must be completely purged from Neon DB');

      const s1SubtasksDbCount = await prisma.subtask.count({ where: { id: { in: stage1SubtaskIds } } });
      assertEqual(s1SubtasksDbCount, 0, 'Stage 1 subtasks must be completely purged from Neon DB');

      const s1Check = await makeRequest('GET', `/api/stages/${stage1Id}`);
      assertEqual(s1Check.status, 404, 'Deleted Stage 1 must return 404');

      for (const tId of stage1TaskIds) {
        const tCheck = await makeRequest('GET', `/api/tasks/${tId}`);
        assertEqual(tCheck.status, 404, `Deleted Task ${tId} must return 404`);
      }

      for (const subId of stage1SubtaskIds) {
        const subCheck = await makeRequest('PATCH', `/api/subtasks/${subId}`, { isDone: true });
        assertEqual(subCheck.status, 404, `Deleted Subtask ${subId} must return 404`);
      }

      const siblingStagesCount = await prisma.stage.count({ where: { id: { in: siblingStageIds } } });
      assertEqual(siblingStagesCount, 2, 'Sibling Stages 2 & 3 must remain intact in Neon DB');

      const siblingTasksCount = await prisma.task.count({ where: { id: { in: siblingTaskIds } } });
      assertEqual(siblingTasksCount, 4, 'Sibling Tasks must remain intact in Neon DB');

      const siblingSubtasksCount = await prisma.subtask.count({ where: { id: { in: siblingSubtaskIds } } });
      assertEqual(siblingSubtasksCount, 8, 'Sibling Subtasks must remain intact in Neon DB');

      const projectCount = await prisma.project.count({ where: { id: cascadeProjectId } });
      assertEqual(projectCount, 1, 'Parent Project must remain intact in Neon DB');

      const logsCount = await prisma.updateLog.count({ where: { projectId: cascadeProjectId } });
      assertEqual(logsCount, 4, 'Parent UpdateLogs must remain intact in Neon DB');

      const membersCount = await prisma.member.count({ where: { projectId: cascadeProjectId } });
      assertEqual(membersCount, 3, 'Parent Members must remain intact in Neon DB');
    }
  );

  await runTest(
    'CHAL-CAS-04',
    'CASCADE_INTEGRITY',
    'Root Project Deletion Cascade: Purges Entire Tree (Zero Orphan Rows in Neon PostgreSQL)',
    async () => {
      const delProjRes = await makeRequest('DELETE', `/api/projects/${cascadeProjectId}`);
      assert(
        delProjRes.status === 204 || delProjRes.status === 200,
        `Expected 204/200 on DELETE project, got ${delProjRes.status}`
      );

      const dbProjectCount = await prisma.project.count({ where: { id: cascadeProjectId } });
      assertEqual(dbProjectCount, 0, 'Project must be deleted from Neon DB');

      const dbStagesCount = await prisma.stage.count({ where: { projectId: cascadeProjectId } });
      assertEqual(dbStagesCount, 0, 'All Stages must be purged from Neon DB');

      const dbTasksCount = await prisma.task.count({ where: { id: { in: taskIds } } });
      assertEqual(dbTasksCount, 0, 'All Tasks must be purged from Neon DB');

      const dbSubtasksCount = await prisma.subtask.count({ where: { id: { in: subtaskIds } } });
      assertEqual(dbSubtasksCount, 0, 'All Subtasks must be purged from Neon DB');

      const dbLogsCount = await prisma.updateLog.count({ where: { projectId: cascadeProjectId } });
      assertEqual(dbLogsCount, 0, 'All UpdateLogs must be purged from Neon DB');

      const dbMembersCount = await prisma.member.count({ where: { projectId: cascadeProjectId } });
      assertEqual(dbMembersCount, 0, 'All Members must be purged from Neon DB');

      const rawStageCheck: any[] = await prisma.$queryRawUnsafe(
        'SELECT count(*) as cnt FROM "Stage" WHERE "projectId" = $1',
        cascadeProjectId
      );
      assertEqual(Number(rawStageCheck[0]?.cnt ?? 0), 0, 'Raw SQL: 0 orphaned Stage rows');

      const rawLogCheck: any[] = await prisma.$queryRawUnsafe(
        'SELECT count(*) as cnt FROM "UpdateLog" WHERE "projectId" = $1',
        cascadeProjectId
      );
      assertEqual(Number(rawLogCheck[0]?.cnt ?? 0), 0, 'Raw SQL: 0 orphaned UpdateLog rows');

      const rawMemberCheck: any[] = await prisma.$queryRawUnsafe(
        'SELECT count(*) as cnt FROM "Member" WHERE "projectId" = $1',
        cascadeProjectId
      );
      assertEqual(Number(rawMemberCheck[0]?.cnt ?? 0), 0, 'Raw SQL: 0 orphaned Member rows');

      const pCheck = await makeRequest('GET', `/api/projects/${cascadeProjectId}`);
      assertEqual(pCheck.status, 404, 'Deleted project GET must return 404');

      for (const sId of siblingStageIds) {
        const sCheck = await makeRequest('GET', `/api/stages/${sId}`);
        assertEqual(sCheck.status, 404, `Deleted stage ${sId} GET must return 404`);
      }

      for (const tId of siblingTaskIds) {
        const tCheck = await makeRequest('GET', `/api/tasks/${tId}`);
        assertEqual(tCheck.status, 404, `Deleted task ${tId} GET must return 404`);
      }

      for (const lId of updateLogIds) {
        const lCheck = await makeRequest('GET', `/api/update-logs/${lId}`);
        assertEqual(lCheck.status, 404, `Deleted log ${lId} GET must return 404`);
      }

      for (const mId of memberIds) {
        const mCheck = await makeRequest('GET', `/api/members/${mId}`);
        assertEqual(mCheck.status, 404, `Deleted member ${mId} GET must return 404`);
      }
    }
  );

  console.log(`\n${colors.magenta}${colors.bright}--- [DOMAIN 2] CONCURRENT MCP SSE SESSIONS & JSON-RPC WIRE ROUTING ---${colors.reset}`);

  let mcpTestProjectId = '';
  let mcpTestStageId = '';
  const NUM_CLIENTS = 5;
  const clients: ConcurrentMcpClient[] = [];

  await runTest(
    'CHAL-MCP-01',
    'MCP_CONCURRENT_SSE',
    `Establish ${NUM_CLIENTS} Simultaneous Active SSE Clients with Unique Session IDs`,
    async () => {
      const pRes = await makeRequest('POST', '/api/projects', {
        title: 'MCP Concurrency Stress Project',
        description: 'Dedicated test target for multi-client concurrent JSON-RPC sessions',
        businessLogic: '# Initial Concurrent Business Logic\n\n- Baseline rules',
        status: 'ACTIVE',
      });
      assert(pRes.status === 201, `Failed to setup MCP project: ${pRes.status}`);
      mcpTestProjectId = pRes.data.id;

      const sRes = await makeRequest('POST', `/api/projects/${mcpTestProjectId}/stages`, {
        title: 'MCP Stage Alpha',
        status: 'IN_PROGRESS',
      });
      assert(sRes.status === 201, `Failed to setup MCP stage: ${sRes.status}`);
      mcpTestStageId = sRes.data.id;

      const connectPromises = [];
      for (let i = 1; i <= NUM_CLIENTS; i++) {
        const client = new ConcurrentMcpClient(`Client-${i}`);
        clients.push(client);
        connectPromises.push(client.connect(8000));
      }

      const sessionIds = await Promise.all(connectPromises);

      assertEqual(sessionIds.length, NUM_CLIENTS, `Must connect all ${NUM_CLIENTS} clients`);
      const uniqueSessionIds = new Set(sessionIds);
      assertEqual(uniqueSessionIds.size, NUM_CLIENTS, 'All SSE session IDs must be strictly unique');

      for (let i = 0; i < NUM_CLIENTS; i++) {
        assert(Boolean(clients[i].sessionId), `Client ${i + 1} must have a valid sessionId`);
        assert(Boolean(clients[i].messagePath), `Client ${i + 1} must have a valid messagePath`);
      }
    }
  );

  await runTest(
    'CHAL-MCP-02',
    'MCP_CONCURRENT_SSE',
    'Concurrent tools/list Discovery Handshake Across All Simultaneous SSE Sessions',
    async () => {
      const listPromises = clients.map((client, idx) =>
        client.listTools(`init-tools-list-${client.clientId}-${idx}`)
      );

      const results = await Promise.all(listPromises);

      assertEqual(results.length, NUM_CLIENTS, 'All clients must receive tools/list response');
      for (const res of results) {
        assert(Array.isArray(res.tools), 'tools/list result must include tools array');
        assert(res.tools.length >= 10, 'tools list must contain at least 10 tools');
        const toolNames = res.tools.map((t: any) => t.name);
        assert(toolNames.includes('read_project_context'), 'Must have read_project_context');
        assert(toolNames.includes('update_business_logic'), 'Must have update_business_logic');
        assert(toolNames.includes('log_project_update'), 'Must have log_project_update');
        assert(toolNames.includes('create_task'), 'Must have create_task');
      }
    }
  );

  await runTest(
    'CHAL-MCP-03',
    'MCP_CONCURRENT_SSE',
    'Concurrent Mixed Tool Invocations (read_project_context, update_business_logic, log_project_update, create_task)',
    async () => {
      const p1 = clients[0].callTool(
        'read_project_context',
        { projectId: mcpTestProjectId },
        'c1-mixed-read-context'
      );

      const p2 = clients[1].callTool(
        'update_business_logic',
        {
          projectId: mcpTestProjectId,
          businessLogic: '# Concurrent Update by Client 2\n\nVerified isolated routing.',
        },
        'c2-mixed-update-bl'
      );

      const p3 = clients[2].callTool(
        'log_project_update',
        {
          projectId: mcpTestProjectId,
          title: 'Concurrent Log by Client 3',
          content: 'Payload sent over isolated SSE channel 3',
          author: 'Client 3 Agent',
        },
        'c3-mixed-log-update'
      );

      const p4 = clients[3].callTool(
        'create_task',
        {
          stageId: mcpTestStageId,
          title: 'Concurrent Task by Client 4',
          description: 'Created simultaneously through Client 4 stream',
          status: 'TODO',
        },
        'c4-mixed-create-task'
      );

      const p5 = clients[4].callTool(
        'read_project_context',
        { projectId: mcpTestProjectId },
        'c5-mixed-read-context'
      );

      const [r1, r2, r3, r4, r5] = await Promise.all([p1, p2, p3, p4, p5]);

      assert(r1 && r1.content && r1.content[0]?.text, 'r1 must return text content');
      const parsedProj = JSON.parse(r1.content[0].text);
      assertEqual(parsedProj.id, mcpTestProjectId, 'r1 returned correct project ID');

      assert(r2 && r2.content && r2.content[0]?.text, 'r2 must return text content');
      assert(r2.content[0].text.includes('sucesso'), 'r2 confirmation text');

      assert(r3 && r3.content && r3.content[0]?.text, 'r3 must return text content');
      assert(r3.content[0].text.includes('sucesso'), 'r3 confirmation text');

      assert(r4 && r4.content && r4.content[0]?.text, 'r4 must return text content');
      assert(r4.content[0].text.includes('Tarefa criada com sucesso'), 'r4 confirmation text');
      const taskIdMatch = r4.content[0].text.match(/Tarefa criada com sucesso:\s*([a-f0-9-]+)/i);
      assert(Boolean(taskIdMatch), 'r4 must contain created task ID');
      const createdTaskId = taskIdMatch[1];
      const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
      assert(Boolean(dbTask), 'Created task must exist in Neon PostgreSQL');
      assertEqual(dbTask?.stageId, mcpTestStageId, 'dbTask stageId matches');
      assertEqual(dbTask?.title, 'Concurrent Task by Client 4', 'dbTask title matches');

      assert(r5 && r5.content && r5.content[0]?.text, 'r5 must return text content');
      const parsedProj5 = JSON.parse(r5.content[0].text);
      assertEqual(parsedProj5.id, mcpTestProjectId, 'r5 returned correct project ID');
    }
  );

  await runTest(
    'CHAL-MCP-04',
    'MCP_CONCURRENT_SSE',
    'Massive Concurrent Barrage (20 Simultaneous In-Flight Tool Calls Across 5 SSE Streams) & Strict Isolation',
    async () => {
      const barragePromises: Promise<any>[] = [];

      for (let c = 0; c < NUM_CLIENTS; c++) {
        const client = clients[c];
        const cNum = c + 1;

        barragePromises.push(
          client.callTool(
            'read_project_context',
            { projectId: mcpTestProjectId },
            `barrage-c${cNum}-req1-read`
          )
        );

        barragePromises.push(
          client.callTool(
            'create_task',
            {
              stageId: mcpTestStageId,
              title: `Barrage Task from Client ${cNum}`,
              description: `Generated during high-concurrency burst by client ${cNum}`,
              status: 'TODO',
            },
            `barrage-c${cNum}-req2-task`
          )
        );

        barragePromises.push(
          client.callTool(
            'log_project_update',
            {
              projectId: mcpTestProjectId,
              title: `Barrage Log from Client ${cNum}`,
              content: `High throughput log written concurrently by client ${cNum}`,
              author: `Stress Agent ${cNum}`,
            },
            `barrage-c${cNum}-req3-log`
          )
        );

        barragePromises.push(
          client.callTool(
            'update_business_logic',
            {
              projectId: mcpTestProjectId,
              businessLogic: `# High Concurrency BL Spec - Written by Client ${cNum}\n\n- Concurrent lock test`,
            },
            `barrage-c${cNum}-req4-bl`
          )
        );
      }

      const barrageResults = await Promise.all(barragePromises);
      assertEqual(barrageResults.length, 20, 'All 20 concurrent requests must complete successfully');

      let totalCrossTalkViolations = 0;
      for (const client of clients) {
        if (client.crossTalkViolations.length > 0) {
          totalCrossTalkViolations += client.crossTalkViolations.length;
          console.error(
            `\n${colors.red}Client ${client.clientId} received ${client.crossTalkViolations.length} cross-talk messages:${colors.reset}`,
            client.crossTalkViolations
          );
        }
      }

      assertEqual(totalCrossTalkViolations, 0, 'Zero cross-talk violations across all concurrent SSE streams');

      for (const client of clients) {
        for (const reqId of client.sentRequestIds) {
          assert(
            client.receivedResponseIds.has(reqId),
            `Client ${client.clientId} must have received response for its own request ${reqId}`
          );
        }
      }
    }
  );

  await runTest(
    'CHAL-MCP-05',
    'MCP_CONCURRENT_SSE',
    'Wire Protocol Boundary: Non-Existent Session ID & Post-Disconnect Isolation (404 Enforcement)',
    async () => {
      const invalidSessionRes = await makeRequest(
        'POST',
        '/mcp/messages?sessionId=00000000-0000-0000-0000-000000000000',
        {
          jsonrpc: '2.0',
          id: 'invalid-session-test',
          method: 'tools/list',
          params: {},
        }
      );
      assertEqual(invalidSessionRes.status, 404, 'Post to non-existent sessionId must return HTTP 404');
      assertEqual(invalidSessionRes.data.error, 'MCP session not found', 'Error message must match');

      const client1 = clients[0];
      const closedSessionId = client1.sessionId!;
      client1.close();

      await new Promise((r) => setTimeout(r, 200));

      const postClosedSessionRes = await makeRequest(
        'POST',
        `/mcp/messages?sessionId=${closedSessionId}`,
        {
          jsonrpc: '2.0',
          id: 'post-close-test',
          method: 'tools/list',
          params: {},
        }
      );
      assertEqual(postClosedSessionRes.status, 404, 'Post to closed sessionId must return HTTP 404');

      const c2List = await clients[1].listTools('c2-post-disconnect-check');
      assert(Array.isArray(c2List.tools), 'Client 2 must remain fully functional');

      const c3Read = await clients[2].callTool(
        'read_project_context',
        { projectId: mcpTestProjectId },
        'c3-post-disconnect-read'
      );
      assert(c3Read.content[0]?.text.includes(mcpTestProjectId), 'Client 3 must remain fully functional');
    }
  );

  for (let i = 1; i < clients.length; i++) {
    clients[i].close();
  }

  if (mcpTestProjectId) {
    await makeRequest('DELETE', `/api/projects/${mcpTestProjectId}`);
  }
  await prisma.$disconnect();

  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASSED').length;
  const failed = testResults.filter((r) => r.status === 'FAILED').length;

  console.log(`\n${colors.cyan}${colors.bright}=========================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}                   CHALLENGER V2 EXECUTION SUMMARY                       ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=========================================================================${colors.reset}`);
  console.log(`Total Empirical Tests:   ${total}`);
  console.log(`Passed:                  ${colors.green}${colors.bright}${passed}${colors.reset}`);
  console.log(`Failed:                  ${failed > 0 ? colors.red + colors.bright + failed + colors.reset : colors.green + '0' + colors.reset}`);
  console.log(`Pass Rate:               ${((passed / total) * 100).toFixed(1)}%`);

  console.log(`\nDetailed Breakdown:`);
  for (const r of testResults) {
    const symbol = r.status === 'PASSED' ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${symbol} [${r.domain}] ${r.id}: ${r.name} (${r.durationMs}ms)`);
    if (r.error) {
      console.log(`      ${colors.red}Error: ${r.error}${colors.reset}`);
    }
  }

  console.log(`${colors.cyan}${colors.bright}=========================================================================${colors.reset}\n`);

  if (failed > 0) {
    console.error(`${colors.red}${colors.bright}VERDICT: REQUEST_CHANGES (${failed} tests failed)${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}VERDICT: APPROVE (All empirical tests passed with 0 errors)${colors.reset}`);
    process.exit(0);
  }
}

runChallengerVerification().catch(async (err) => {
  console.error(`${colors.red}Fatal Harness Exception:${colors.reset}`, err);
  await prisma.$disconnect();
  process.exit(1);
});
