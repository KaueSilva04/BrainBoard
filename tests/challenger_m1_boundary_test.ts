/**
 * Challenger 1: Empirical Boundary & Stress Test Harness for Milestone 1
 *
 * Verifies:
 * 1. MCP Tool Schemas (properties, required fields, enums)
 * 2. MCP CallTool negative & boundary execution (unknown tools, missing args, invalid enums, non-existent UUIDs)
 * 3. REST API negative & boundary execution (HTTP 400, 404 responses for malformed payloads, non-existent UUIDs, invalid enums)
 * 4. Cascade deletion and lifecycle integrity
 * 5. MCP SSE Transport endpoints
 */

import 'dotenv/config';
import http from 'http';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer, taskService, subtaskService, prisma } from '../backend/src/index.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestRecord {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testRecords: TestRecord[] = [];

async function test(id: string, name: string, category: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testRecords.push({ id, name, category, passed: true, durationMs });
    console.log(`  ${colors.green}✓ [PASS]${colors.reset} ${colors.bright}${id}${colors.reset} - ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errorMsg = err?.message || String(err);
    testRecords.push({ id, name, category, passed: false, error: errorMsg, durationMs });
    console.log(`  ${colors.red}✗ [FAIL]${colors.reset} ${colors.bright}${id}${colors.reset} - ${name} (${durationMs}ms)`);
    console.log(`     ${colors.red}Error:${colors.reset} ${errorMsg}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function httpRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any; raw: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const postData = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 0, data, raw, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${method} ${path}`));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

async function runEmpiricalSuite() {
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  CHALLENGER 1: M1 EMPIRICAL BOUNDARY & ERROR VERIFICATION SUITE  ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}\n`);

  // Setup MCP server instance and handlers
  const mcp = createMcpServer();
  // @ts-ignore
  const listToolsHandler = mcp._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
  // @ts-ignore
  const callToolHandler = mcp._requestHandlers.get(CallToolRequestSchema.shape.method.value);

  assert(Boolean(listToolsHandler), 'MCP ListTools handler must be registered');
  assert(Boolean(callToolHandler), 'MCP CallTool handler must be registered');

  // ============================================================================
  // PART 1: MCP TOOL SCHEMAS & CONTRACT VERIFICATION
  // ============================================================================
  console.log(`${colors.blue}${colors.bright}--- PART 1: MCP TOOL SCHEMAS & REGISTRATION CONTRACTS ---${colors.reset}`);

  const toolsResponse = await listToolsHandler({ method: 'tools/list', params: {} });
  const tools: any[] = toolsResponse.tools;

  await test('MCP-SCH-01', 'Verify all 9 MCP tools are registered in schema', 'MCP_SCHEMA', () => {
    const requiredTools = [
      'list_tasks',
      'create_task',
      'move_task',
      'add_subtask',
      'toggle_subtask',
      'update_task',
      'delete_task',
      'delete_subtask',
      'get_task',
    ];
    for (const toolName of requiredTools) {
      const found = tools.find((t) => t.name === toolName);
      assert(Boolean(found), `Missing MCP tool registration: ${toolName}`);
    }
    assert(tools.length >= 9, `Expected at least 9 MCP tools, found ${tools.length}`);
  });

  await test('MCP-SCH-02', 'Verify add_subtask tool schema and required fields', 'MCP_SCHEMA', () => {
    const tool = tools.find((t) => t.name === 'add_subtask');
    assert(Boolean(tool), 'add_subtask tool not found');
    assert(tool.inputSchema.type === 'object', 'inputSchema must be object');
    assert(Array.isArray(tool.inputSchema.required), 'required must be array');
    assert(tool.inputSchema.required.includes('taskId'), 'required must include taskId');
    assert(tool.inputSchema.required.includes('title'), 'required must include title');
  });

  await test('MCP-SCH-03', 'Verify toggle_subtask tool schema and required fields', 'MCP_SCHEMA', () => {
    const tool = tools.find((t) => t.name === 'toggle_subtask');
    assert(Boolean(tool), 'toggle_subtask tool not found');
    assert(Array.isArray(tool.inputSchema.required), 'required must be array');
    assert(tool.inputSchema.required.includes('id'), 'required must include id');
    assert(tool.inputSchema.properties?.isDone?.type === 'boolean', 'isDone must be optional boolean');
  });

  await test('MCP-SCH-04', 'Verify create_task and move_task enum validations', 'MCP_SCHEMA', () => {
    const createTool = tools.find((t) => t.name === 'create_task');
    assert(Boolean(createTool), 'create_task tool not found');
    const categories = createTool.inputSchema.properties?.category?.enum;
    assert(Array.isArray(categories), 'category enum must be defined');
    assert(categories.includes('PROJECT') && categories.includes('COLLEGE') && categories.includes('PERSONAL'), 'category enum values must match specification');

    const moveTool = tools.find((t) => t.name === 'move_task');
    assert(Boolean(moveTool), 'move_task tool not found');
    const statuses = moveTool.inputSchema.properties?.status?.enum;
    assert(Array.isArray(statuses), 'status enum must be defined');
    assert(statuses.includes('TODO') && statuses.includes('IN_PROGRESS') && statuses.includes('DONE'), 'status enum values must match specification');
  });

  // ============================================================================
  // PART 2: MCP CALLTOOL ADVERSARIAL & BOUNDARY EXECUTION
  // ============================================================================
  console.log(`\n${colors.blue}${colors.bright}--- PART 2: MCP CALLTOOL ADVERSARIAL & ERROR HANDLING ---${colors.reset}`);

  await test('MCP-ERR-01', 'MCP rejects call to unknown tool name', 'MCP_ERROR', async () => {
    let threw = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'non_existent_tool_xyz', arguments: {} },
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('unknown') || e.message.includes('Unknown'), 'Error must indicate unknown tool');
    }
    assert(threw, 'Must throw error on unknown tool call');
  });

  await test('MCP-ERR-02', 'MCP create_task rejects missing/empty title', 'MCP_ERROR', async () => {
    let threw = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'create_task', arguments: { title: '   ', category: 'PROJECT' } },
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('title'), 'Error message must mention title');
    }
    assert(threw, 'Must throw when title is empty or whitespace');
  });

  await test('MCP-ERR-03', 'MCP create_task rejects invalid category enum', 'MCP_ERROR', async () => {
    let threw = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'create_task', arguments: { title: 'Valid Title', category: 'INVALID_CATEGORY' } },
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('category') || e.name === 'ValidationError', 'Error must indicate invalid category');
    }
    assert(threw, 'Must throw on invalid category enum');
  });

  await test('MCP-ERR-04', 'MCP move_task rejects missing ID or invalid status', 'MCP_ERROR', async () => {
    let threw1 = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'move_task', arguments: { id: '', status: 'DONE' } },
      });
    } catch {
      threw1 = true;
    }
    assert(threw1, 'Must throw when ID is missing');

    let threw2 = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'move_task', arguments: { id: 'some-id', status: 'NOT_A_STATUS' } },
      });
    } catch {
      threw2 = true;
    }
    assert(threw2, 'Must throw when status enum is invalid');
  });

  await test('MCP-ERR-05', 'MCP add_subtask rejects missing taskId and empty title', 'MCP_ERROR', async () => {
    let threw = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: { name: 'add_subtask', arguments: { taskId: '', title: '' } },
      });
    } catch (e: any) {
      threw = true;
    }
    assert(threw, 'Must throw when taskId and title are empty');
  });

  await test('MCP-ERR-06', 'MCP add_subtask rejects non-existent parent taskId', 'MCP_ERROR', async () => {
    let threw = false;
    try {
      await callToolHandler({
        method: 'tools/call',
        params: {
          name: 'add_subtask',
          arguments: { taskId: '00000000-0000-0000-0000-000000000000', title: 'Orphan Subtask' },
        },
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('Task not found') || e.name === 'NotFoundError', 'Must return NotFoundError for missing parent');
    }
    assert(threw, 'Must throw NotFoundError when parent task does not exist');
  });

  await test('MCP-ERR-07', 'MCP get_task on non-existent UUID returns isError: true response', 'MCP_ERROR', async () => {
    const res = await callToolHandler({
      method: 'tools/call',
      params: { name: 'get_task', arguments: { id: '00000000-0000-0000-0000-000000000000' } },
    });
    assert(res.isError === true, 'Response must have isError: true');
    assert(res.content[0].text.includes('não encontrada'), 'Error text must indicate task not found');
  });

  // ============================================================================
  // PART 3: LIVE REST API BOUNDARY & HTTP 400/404 VERIFICATION
  // ============================================================================
  console.log(`\n${colors.blue}${colors.bright}--- PART 3: LIVE REST API BOUNDARY & HTTP ERROR CODES ---${colors.reset}`);

  // Test GET /api/health
  await test('REST-HLT-01', 'GET /api/health returns 200 with status ok', 'REST_HEALTH', async () => {
    const res = await httpRequest('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'ok', 'Health status must be ok');
  });

  // Test POST /api/tasks boundary failures (HTTP 400)
  await test('REST-BND-01', 'POST /api/tasks with empty body returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {});
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(Boolean(res.data.error), 'Must return error message in JSON');
  });

  await test('REST-BND-02', 'POST /api/tasks with whitespace-only title returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: '     \t\n  ',
      category: 'PROJECT',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Title is required'), 'Error message must specify Title is required');
  });

  await test('REST-BND-03', 'POST /api/tasks with non-string title returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: 12345,
      category: 'PROJECT',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('REST-BND-04', 'POST /api/tasks with missing category returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: 'Valid Title No Category',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('category'), 'Error message must mention category');
  });

  await test('REST-BND-05', 'POST /api/tasks with invalid category enum returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: 'Valid Title',
      category: 'ENTERTAINMENT',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Valid category'), 'Error message must indicate valid categories');
  });

  await test('REST-BND-06', 'POST /api/tasks with lowercase category returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: 'Valid Title',
      category: 'project',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // Valid Task Creation
  let createdTaskId: string = '';
  await test('REST-VAL-01', 'POST /api/tasks with valid payload returns HTTP 201 and task JSON', 'REST_SUCCESS', async () => {
    const res = await httpRequest('POST', '/api/tasks', {
      title: 'Challenger Empirical Master Task',
      category: 'PROJECT',
      description: 'Boundary test task created by Challenger 1',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(Boolean(res.data.id), 'Response must contain task ID');
    assert(res.data.title === 'Challenger Empirical Master Task', 'Title must match');
    assert(res.data.status === 'TODO', 'Default status must be TODO');
    assert(Array.isArray(res.data.subtasks), 'Subtasks array must be present');
    createdTaskId = res.data.id;
  });

  // Test GET /api/tasks filters & validation
  await test('REST-BND-07', 'GET /api/tasks with invalid category query param returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('GET', '/api/tasks?category=UNKNOWN_CAT');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Invalid category'), 'Error must state Invalid category');
  });

  await test('REST-BND-08', 'GET /api/tasks with invalid status query param returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('GET', '/api/tasks?status=ARCHIVED');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Invalid status'), 'Error must state Invalid status');
  });

  await test('REST-VAL-02', 'GET /api/tasks with valid filter returns HTTP 200 array', 'REST_SUCCESS', async () => {
    const res = await httpRequest('GET', '/api/tasks?category=PROJECT&status=TODO');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Result must be an array');
    const found = res.data.find((t: any) => t.id === createdTaskId);
    assert(Boolean(found), 'Created task must be found in filtered query');
  });

  // Test GET /api/tasks/:id
  await test('REST-BND-09', 'GET /api/tasks/:id with non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('GET', '/api/tasks/00000000-0000-0000-0000-000000000000');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data.error === 'Task not found', 'Must return Task not found');
  });

  await test('REST-VAL-03', 'GET /api/tasks/:id with valid ID returns HTTP 200 and task details', 'REST_SUCCESS', async () => {
    const res = await httpRequest('GET', `/api/tasks/${createdTaskId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.id === createdTaskId, 'Returned task ID must match');
  });

  // Test PATCH /api/tasks/:id
  await test('REST-BND-10', 'PATCH /api/tasks/:id with non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', '/api/tasks/00000000-0000-0000-0000-000000000000', {
      status: 'DONE',
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data.error === 'Task not found', 'Must return Task not found');
  });

  await test('REST-BND-11', 'PATCH /api/tasks/:id with invalid status returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', `/api/tasks/${createdTaskId}`, {
      status: 'BLOCKED',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Invalid status'), 'Error must specify Invalid status');
  });

  await test('REST-BND-12', 'PATCH /api/tasks/:id with empty title returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', `/api/tasks/${createdTaskId}`, {
      title: '   ',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('Title cannot be empty'), 'Error must specify Title cannot be empty');
  });

  await test('REST-BND-13', 'PATCH /api/tasks/:id with invalid category returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', `/api/tasks/${createdTaskId}`, {
      category: 'NON_EXISTENT',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('REST-VAL-04', 'PATCH /api/tasks/:id with valid updates returns HTTP 200', 'REST_SUCCESS', async () => {
    const res = await httpRequest('PATCH', `/api/tasks/${createdTaskId}`, {
      title: 'Challenger Master Task (Updated)',
      status: 'IN_PROGRESS',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.title === 'Challenger Master Task (Updated)', 'Title must be updated');
    assert(res.data.status === 'IN_PROGRESS', 'Status must be updated to IN_PROGRESS');
  });

  // Test PATCH /api/tasks/:id/status alias
  await test('REST-BND-14', 'PATCH /api/tasks/:id/status with non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', '/api/tasks/00000000-0000-0000-0000-000000000000/status', {
      status: 'DONE',
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('REST-BND-15', 'PATCH /api/tasks/:id/status with missing or invalid status returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res1 = await httpRequest('PATCH', `/api/tasks/${createdTaskId}/status`, {});
    assert(res1.status === 400, `Expected 400, got ${res1.status}`);

    const res2 = await httpRequest('PATCH', `/api/tasks/${createdTaskId}/status`, { status: 'INVALID' });
    assert(res2.status === 400, `Expected 400, got ${res2.status}`);
  });

  await test('REST-VAL-05', 'PATCH /api/tasks/:id/status updates status returns HTTP 200', 'REST_SUCCESS', async () => {
    const res = await httpRequest('PATCH', `/api/tasks/${createdTaskId}/status`, { status: 'DONE' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'DONE', 'Status must be updated to DONE');
  });

  // Test Subtask endpoints: POST /api/tasks/:id/subtasks
  await test('REST-BND-16', 'POST /api/tasks/:id/subtasks on non-existent task returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', '/api/tasks/00000000-0000-0000-0000-000000000000/subtasks', {
      title: 'Valid Title On Missing Task',
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data.error === 'Task not found', 'Must return Task not found');
  });

  await test('REST-BND-17', 'POST /api/tasks/:id/subtasks with empty or whitespace title returns HTTP 400', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('POST', `/api/tasks/${createdTaskId}/subtasks`, {
      title: '     ',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error === 'Title is required', 'Must return Title is required');
  });

  let createdSubtaskId1 = '';
  let createdSubtaskId2 = '';
  await test('REST-VAL-06', 'POST /api/tasks/:id/subtasks creates subtask and returns HTTP 201', 'REST_SUCCESS', async () => {
    const res1 = await httpRequest('POST', `/api/tasks/${createdTaskId}/subtasks`, {
      title: 'First Subtask for Testing',
    });
    assert(res1.status === 201, `Expected 201, got ${res1.status}`);
    assert(Boolean(res1.data.id), 'Subtask must have ID');
    assert(res1.data.isDone === false, 'Subtask isDone must default to false');
    assert(res1.data.taskId === createdTaskId, 'Subtask taskId must match parent');
    createdSubtaskId1 = res1.data.id;

    const res2 = await httpRequest('POST', `/api/tasks/${createdTaskId}/subtasks`, {
      title: 'Second Subtask for Cascade Check',
    });
    assert(res2.status === 201, `Expected 201, got ${res2.status}`);
    createdSubtaskId2 = res2.data.id;
  });

  // Test PATCH /api/subtasks/:id
  await test('REST-BND-18', 'PATCH /api/subtasks/:id on non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', '/api/subtasks/00000000-0000-0000-0000-000000000000', {
      isDone: true,
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data.error === 'Subtask not found', 'Must return Subtask not found');
  });

  await test('REST-VAL-07', 'PATCH /api/subtasks/:id sets isDone explicitly to true returns HTTP 200', 'REST_SUCCESS', async () => {
    const res = await httpRequest('PATCH', `/api/subtasks/${createdSubtaskId1}`, {
      isDone: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.isDone === true, 'Subtask isDone must be true');
  });

  await test('REST-VAL-08', 'PATCH /api/subtasks/:id inverts isDone when body is empty returns HTTP 200', 'REST_SUCCESS', async () => {
    const res = await httpRequest('PATCH', `/api/subtasks/${createdSubtaskId1}`, {});
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.isDone === false, 'Subtask isDone must be inverted back to false');
  });

  // Test PATCH /api/subtasks/:id/toggle alias
  await test('REST-BND-19', 'PATCH /api/subtasks/:id/toggle on non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('PATCH', '/api/subtasks/00000000-0000-0000-0000-000000000000/toggle');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('REST-VAL-09', 'PATCH /api/subtasks/:id/toggle toggles status returns HTTP 200', 'REST_SUCCESS', async () => {
    const res = await httpRequest('PATCH', `/api/subtasks/${createdSubtaskId1}/toggle`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.isDone === true, 'Subtask isDone must be toggled to true');
  });

  // Test DELETE /api/subtasks/:id
  await test('REST-BND-20', 'DELETE /api/subtasks/:id on non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('DELETE', '/api/subtasks/00000000-0000-0000-0000-000000000000');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('REST-VAL-10', 'DELETE /api/subtasks/:id deletes subtask and returns HTTP 204', 'REST_SUCCESS', async () => {
    const res = await httpRequest('DELETE', `/api/subtasks/${createdSubtaskId1}`);
    assert(res.status === 204, `Expected 204, got ${res.status}`);

    // Re-delete must now return 404
    const reDelete = await httpRequest('DELETE', `/api/subtasks/${createdSubtaskId1}`);
    assert(reDelete.status === 404, `Expected 404 on re-delete, got ${reDelete.status}`);
  });

  // Test DELETE /api/tasks/:id & Cascade Deletion
  await test('REST-BND-21', 'DELETE /api/tasks/:id on non-existent UUID returns HTTP 404', 'REST_BOUNDARY', async () => {
    const res = await httpRequest('DELETE', '/api/tasks/00000000-0000-0000-0000-000000000000');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('REST-VAL-11', 'DELETE /api/tasks/:id deletes task, cascades subtasks, returns HTTP 204', 'REST_SUCCESS', async () => {
    const res = await httpRequest('DELETE', `/api/tasks/${createdTaskId}`);
    assert(res.status === 204, `Expected 204, got ${res.status}`);

    // Re-delete must return 404
    const reDelete = await httpRequest('DELETE', `/api/tasks/${createdTaskId}`);
    assert(reDelete.status === 404, `Expected 404 on re-delete, got ${reDelete.status}`);

    // Verify cascaded subtask 2 was automatically deleted from DB
    const cascadedCheck = await httpRequest('PATCH', `/api/subtasks/${createdSubtaskId2}`, { isDone: true });
    assert(cascadedCheck.status === 404, 'Cascaded subtask must no longer exist (expected 404)');
  });

  // ============================================================================
  // PART 4: SSE TRANSPORT & MESSAGE ROUTING VERIFICATION
  // ============================================================================
  console.log(`\n${colors.blue}${colors.bright}--- PART 4: SSE TRANSPORT & SESSION ROUTING ---${colors.reset}`);

  await test('SSE-TRN-01', 'GET /mcp/sse responds with text/event-stream headers', 'SSE_TRANSPORT', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/mcp/sse',
          method: 'GET',
          headers: { Accept: 'text/event-stream' },
        },
        (res) => {
          assert(res.statusCode === 200, `Expected 200 SSE stream, got ${res.statusCode}`);
          assert(
            String(res.headers['content-type']).includes('text/event-stream'),
            'Content-type must be text/event-stream'
          );
          req.destroy();
          resolve();
        }
      );
      req.on('error', (err) => {
        // req.destroy can cause ECONNRESET on client side, which is expected
        if ((err as any).code !== 'ECONNRESET') reject(err);
      });
      req.end();
    });
  });

  await test('SSE-TRN-02', 'POST /mcp/messages with invalid sessionId returns HTTP 404', 'SSE_TRANSPORT', async () => {
    const res = await httpRequest('POST', '/mcp/messages?sessionId=non_existent_session_id', {
      jsonrpc: '2.0',
      method: 'ping',
      id: 1,
    });
    assert(res.status === 404, `Expected 404 for invalid sessionId, got ${res.status}`);
    assert(res.data.error.includes('not found'), 'Must state MCP session not found');
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log(`\n${colors.cyan}${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}                     EXECUTION SUMMARY                          ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================${colors.reset}`);

  const total = testRecords.length;
  const passed = testRecords.filter((t) => t.passed).length;
  const failed = testRecords.filter((t) => !t.passed).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Empirical Boundary Tests: ${colors.bright}${total}${colors.reset}`);
  console.log(`Passed:                         ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:                         ${colors.red}${failed}${colors.reset}`);
  console.log(`Pass Rate:                      ${colors.bright}${passRate}%${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}Failures identified:${colors.reset}`);
    for (const f of testRecords.filter((t) => !t.passed)) {
      console.log(`  - [${f.id}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`${colors.green}ALL EMPIRICAL BOUNDARY TESTS PASSED WITH 100% SUCCESS!${colors.reset}\n`);
    process.exit(0);
  }
}

runEmpiricalSuite().catch((err) => {
  console.error('Empirical Suite Fatal Error:', err);
  process.exit(1);
});
