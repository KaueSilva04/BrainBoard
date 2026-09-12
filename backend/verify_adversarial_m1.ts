/**
 * FocusTask Adversarial Stress & Concurrency Test Suite
 * Milestone 1 (M1) Backend Empirical Verification
 * 
 * Verifies:
 * - Cascade Deletion integrity (zero orphan records in DB under all conditions)
 * - Sibling task isolation during cascade deletion
 * - Subtask toggling edge cases (inversion, explicit booleans, non-boolean, non-existent, invalid)
 * - Concurrency & race conditions (parallel toggles, parallel cascade deletions, double deletes)
 * - MCP tool validation for subtask operations
 */

import 'dotenv/config';

// The server listens on process.env.PORT || 3000
const BASE_URL = 'http://127.0.0.1:3000';

import { prisma, createMcpServer, taskService, subtaskService } from './src/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

interface StressTestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testResults: StressTestResult[] = [];

async function runAdversarialTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ suite, name, passed: true, durationMs });
    console.log(`  ✅ [PASS] ${suite} -> ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({ suite, name, passed: false, error: err.message || String(err), durationMs });
    console.error(`  ❌ [FAIL] ${suite} -> ${name} (${durationMs}ms)`);
    console.error(`     Error: ${err.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function request(method: string, path: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('\n================================================================');
  console.log('🚀 FOCUS-TASK M1 ADVERSARIAL EMPIRICAL STRESS & CONCURRENCY SUITE');
  console.log('================================================================\n');

  // Wait briefly for server to bind
  await new Promise((resolve) => setTimeout(resolve, 600));

  // =========================================================================
  // SUITE 1: CASCADE DELETION INTEGRITY & ISOLATION
  // =========================================================================
  console.log('\n--- SUITE 1: CASCADE DELETION INTEGRITY & ORPHAN PREVENTION ---');

  await runAdversarialTest('Cascade', '1.1: Deletion of task with 0 subtasks', async () => {
    const createRes = await request('POST', '/api/tasks', {
      title: '[ADV-1.1] Zero Subtask Task',
      category: 'PROJECT',
    });
    assert(createRes.status === 201, `Failed to create task: ${createRes.status}`);
    const taskId = createRes.data.id;

    const delRes = await request('DELETE', `/api/tasks/${taskId}`);
    assert(delRes.status === 204, `Expected 204, got ${delRes.status}`);

    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    assert(dbTask === null, 'Task must be null in database');
  });

  await runAdversarialTest('Cascade', '1.2: Deletion of task with 1 subtask removes child without orphan', async () => {
    const createRes = await request('POST', '/api/tasks', {
      title: '[ADV-1.2] Single Subtask Task',
      category: 'COLLEGE',
    });
    const taskId = createRes.data.id;

    const subRes = await request('POST', `/api/tasks/${taskId}/subtasks`, {
      title: 'Subtask to be cascaded',
    });
    assert(subRes.status === 201, `Failed to create subtask: ${subRes.status}`);
    const subtaskId = subRes.data.id;

    const delRes = await request('DELETE', `/api/tasks/${taskId}`);
    assert(delRes.status === 204, `Expected 204, got ${delRes.status}`);

    // Verify parent is deleted
    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    assert(dbTask === null, 'Task must be deleted');

    // Verify child is deleted
    const dbSubtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    assert(dbSubtask === null, 'Child subtask must be deleted via cascade');

    // Raw SQL verification
    const rawCount: any[] = await prisma.$queryRaw`SELECT count(*)::int as cnt FROM "Subtask" WHERE "id" = ${subtaskId}`;
    assert(rawCount[0]?.cnt === 0, 'Raw SQL count of deleted subtask must be 0');
  });

  await runAdversarialTest('Cascade', '1.3: Deletion of task with 25 subtasks (mixed isDone states)', async () => {
    const createRes = await request('POST', '/api/tasks', {
      title: '[ADV-1.3] 25 Subtasks Task',
      category: 'PERSONAL',
    });
    const taskId = createRes.data.id;

    const subtaskIds: string[] = [];
    for (let i = 0; i < 25; i++) {
      const sub = await prisma.subtask.create({
        data: {
          taskId,
          title: `Subtask #${i + 1}`,
          isDone: i % 2 === 0,
        },
      });
      subtaskIds.push(sub.id);
    }
    assert(subtaskIds.length === 25, 'Expected 25 subtasks created');

    const delRes = await request('DELETE', `/api/tasks/${taskId}`);
    assert(delRes.status === 204, `Expected 204, got ${delRes.status}`);

    // Direct findMany orphan check
    const remaining = await prisma.subtask.findMany({
      where: { id: { in: subtaskIds } },
    });
    assert(remaining.length === 0, `Expected 0 orphan subtasks, found ${remaining.length}`);

    // Raw SQL count for taskId
    const rawCount: any[] = await prisma.$queryRaw`SELECT count(*)::int as cnt FROM "Subtask" WHERE "taskId" = ${taskId}`;
    assert(rawCount[0]?.cnt === 0, `Expected 0 subtasks in DB for taskId, found ${rawCount[0]?.cnt}`);
  });

  await runAdversarialTest('Cascade', '1.4: Sibling task isolation during cascade deletion', async () => {
    // Create Task A and Task B
    const taskA = await taskService.createTask({ title: '[ADV-1.4] Task A', category: 'PROJECT' });
    const taskB = await taskService.createTask({ title: '[ADV-1.4] Task B', category: 'PROJECT' });

    // Add 5 subtasks to Task A and 5 to Task B
    const subtasksA: string[] = [];
    const subtasksB: string[] = [];
    for (let i = 0; i < 5; i++) {
      const subA = await subtaskService.createSubtask(taskA.id, `Task A Subtask ${i}`);
      const subB = await subtaskService.createSubtask(taskB.id, `Task B Subtask ${i}`);
      subtasksA.push(subA.id);
      subtasksB.push(subB.id);
    }

    // Delete Task A only
    const delRes = await request('DELETE', `/api/tasks/${taskA.id}`);
    assert(delRes.status === 204, 'Task A deletion should return 204');

    // Verify Task A and all its subtasks are deleted
    const checkA = await prisma.task.findUnique({ where: { id: taskA.id } });
    assert(checkA === null, 'Task A must be null');
    const remainingA = await prisma.subtask.findMany({ where: { id: { in: subtasksA } } });
    assert(remainingA.length === 0, 'All Task A subtasks must be deleted');

    // CRITICAL: Verify Task B and ALL its subtasks remain 100% intact!
    const checkB = await prisma.task.findUnique({
      where: { id: taskB.id },
      include: { subtasks: true },
    });
    assert(checkB !== null, 'Task B must remain intact');
    assert(checkB!.subtasks.length === 5, `Expected 5 subtasks for Task B, found ${checkB!.subtasks.length}`);
    const remainingBIds = checkB!.subtasks.map((s) => s.id).sort();
    assert(
      JSON.stringify(remainingBIds) === JSON.stringify(subtasksB.sort()),
      'All Task B subtask IDs must match original subtask IDs'
    );

    // Cleanup Task B
    await request('DELETE', `/api/tasks/${taskB.id}`);
    const cleanupCheck = await prisma.subtask.findMany({ where: { id: { in: subtasksB } } });
    assert(cleanupCheck.length === 0, 'Task B subtasks cleaned up successfully');
  });

  await runAdversarialTest('Cascade', '1.5: High-concurrency cascade deletion of multiple tasks', async () => {
    // Concurrently create 5 tasks with 5 subtasks each (25 subtasks total)
    const taskIds: string[] = [];
    const allSubtaskIds: string[] = [];

    const tasks = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        taskService.createTask({ title: `[ADV-1.5] Concurrent Task ${i}`, category: 'COLLEGE' })
      )
    );

    for (const t of tasks) {
      taskIds.push(t.id);
      const subs = await Promise.all(
        Array.from({ length: 5 }, (_, j) => subtaskService.createSubtask(t.id, `Sub ${j}`))
      );
      allSubtaskIds.push(...subs.map((s) => s.id));
    }

    assert(taskIds.length === 5, '5 tasks created');
    assert(allSubtaskIds.length === 25, '25 subtasks created');

    // Concurrently delete all 5 tasks
    const deleteResults = await Promise.all(
      taskIds.map((id) => request('DELETE', `/api/tasks/${id}`))
    );

    for (const r of deleteResults) {
      assert(r.status === 204, `Expected 204 for concurrent delete, got ${r.status}`);
    }

    // Verify 0 orphan subtasks in database
    const orphans = await prisma.subtask.findMany({
      where: { id: { in: allSubtaskIds } },
    });
    assert(orphans.length === 0, `Expected 0 orphan subtasks after concurrent delete, found ${orphans.length}`);
  });

  await runAdversarialTest('Cascade', '1.6: Double deletion race condition on same task ID', async () => {
    const task = await taskService.createTask({ title: '[ADV-1.6] Double Delete Race', category: 'PROJECT' });
    await subtaskService.createSubtask(task.id, 'Subtask');

    // Fire 2 simultaneous DELETE requests
    const [res1, res2] = await Promise.all([
      request('DELETE', `/api/tasks/${task.id}`),
      request('DELETE', `/api/tasks/${task.id}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must be 204, the other must be 404 (Not Found)
    assert(
      statuses[0] === 204 && statuses[1] === 404,
      `Expected one 204 and one 404, got statuses: ${statuses.join(', ')}`
    );
  });

  await runAdversarialTest('Cascade', '1.7: Non-existent task deletion returns 404', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request('DELETE', `/api/tasks/${nonExistentId}`);
    assert(res.status === 404, `Expected 404 for non-existent task delete, got ${res.status}`);
    assert(res.data?.error === 'Task not found', `Expected 'Task not found', got ${res.data?.error}`);
  });

  // =========================================================================
  // SUITE 2: SUBTASK TOGGLING EDGE CASES & CONCURRENCY
  // =========================================================================
  console.log('\n--- SUITE 2: SUBTASK TOGGLING EDGE CASES & CONCURRENCY ---');

  await runAdversarialTest('Toggle', '2.1: Multi-cycle boolean inversion toggling', async () => {
    const task = await taskService.createTask({ title: '[ADV-2.1] Inversion Task', category: 'PROJECT' });
    const sub = await subtaskService.createSubtask(task.id, 'Inversion Subtask');
    assert(sub.isDone === false, 'Initial state must be false');

    // Cycle 1: false -> true
    const t1 = await request('PATCH', `/api/subtasks/${sub.id}`, {});
    assert(t1.status === 200 && t1.data.isDone === true, 'Cycle 1: false -> true failed');

    // Cycle 2: true -> false
    const t2 = await request('PATCH', `/api/subtasks/${sub.id}`, {});
    assert(t2.status === 200 && t2.data.isDone === false, 'Cycle 2: true -> false failed');

    // Cycle 3: false -> true via /toggle alias
    const t3 = await request('PATCH', `/api/subtasks/${sub.id}/toggle`, {});
    assert(t3.status === 200 && t3.data.isDone === true, 'Cycle 3: false -> true (/toggle) failed');

    // Cycle 4: true -> false via /toggle alias
    const t4 = await request('PATCH', `/api/subtasks/${sub.id}/toggle`, {});
    assert(t4.status === 200 && t4.data.isDone === false, 'Cycle 4: true -> false (/toggle) failed');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('Toggle', '2.2: Explicit boolean overrides and idempotency', async () => {
    const task = await taskService.createTask({ title: '[ADV-2.2] Explicit Task', category: 'PERSONAL' });
    const sub = await subtaskService.createSubtask(task.id, 'Explicit Subtask');

    // Explicit true
    const setTrue1 = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: true });
    assert(setTrue1.status === 200 && setTrue1.data.isDone === true, 'Explicit true failed');

    // Explicit true again (idempotent)
    const setTrue2 = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: true });
    assert(setTrue2.status === 200 && setTrue2.data.isDone === true, 'Idempotent true failed');

    // Explicit false
    const setFalse1 = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: false });
    assert(setFalse1.status === 200 && setFalse1.data.isDone === false, 'Explicit false failed');

    // Explicit false again (idempotent)
    const setFalse2 = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: false });
    assert(setFalse2.status === 200 && setFalse2.data.isDone === false, 'Idempotent false failed');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('Toggle', '2.3: Non-boolean and edge payloads handling', async () => {
    const task = await taskService.createTask({ title: '[ADV-2.3] Edge Payloads', category: 'COLLEGE' });
    const sub = await subtaskService.createSubtask(task.id, 'Edge Payload Subtask');
    assert(sub.isDone === false, 'Initial state is false');

    // String payload: "true" (not a boolean, should treat as toggle inversion without crashing)
    const strRes = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: 'true' });
    assert(strRes.status === 200, `Expected 200, got ${strRes.status}`);
    assert(strRes.data.isDone === true, 'Should have toggled to true');

    // null payload: should treat as toggle inversion without crashing
    const nullRes = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: null });
    assert(nullRes.status === 200, `Expected 200, got ${nullRes.status}`);
    assert(nullRes.data.isDone === false, 'Should have toggled back to false');

    // number payload: 1
    const numRes = await request('PATCH', `/api/subtasks/${sub.id}`, { isDone: 1 });
    assert(numRes.status === 200, `Expected 200, got ${numRes.status}`);
    assert(numRes.data.isDone === true, 'Should have toggled to true');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('Toggle', '2.4: Non-existent subtask toggle returns 404', async () => {
    const nonExistentSubId = '00000000-0000-0000-0000-000000000000';
    const res = await request('PATCH', `/api/subtasks/${nonExistentSubId}`, { isDone: true });
    assert(res.status === 404, `Expected 404 for non-existent subtask, got ${res.status}`);
    assert(res.data?.error === 'Subtask not found', `Expected 'Subtask not found', got ${res.data?.error}`);

    // Test on /toggle alias as well
    const aliasRes = await request('PATCH', `/api/subtasks/${nonExistentSubId}/toggle`, {});
    assert(aliasRes.status === 404, `Expected 404 on toggle alias, got ${aliasRes.status}`);
  });

  await runAdversarialTest('Toggle', '2.5: High-concurrency rapid toggling stress test', async () => {
    const task = await taskService.createTask({ title: '[ADV-2.5] Concurrency Toggle', category: 'PROJECT' });
    const sub = await subtaskService.createSubtask(task.id, 'Rapid Toggle Subtask');

    // Fire 20 concurrent toggle requests
    const togglePromises = Array.from({ length: 20 }, () =>
      request('PATCH', `/api/subtasks/${sub.id}`, {})
    );

    const responses = await Promise.all(togglePromises);
    for (const r of responses) {
      assert(r.status === 200, `Concurrent toggle failed with status: ${r.status}`);
      assert(typeof r.data.isDone === 'boolean', 'isDone must be boolean in every response');
    }

    // Verify DB integrity
    const finalSub = await prisma.subtask.findUnique({ where: { id: sub.id } });
    assert(finalSub !== null, 'Subtask must still exist');
    assert(typeof finalSub!.isDone === 'boolean', 'Final isDone must be a boolean in database');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('Toggle', '2.6: MCP toggle_subtask tool contract and edge cases', async () => {
    const task = await taskService.createTask({ title: '[ADV-2.6] MCP Toggle', category: 'PERSONAL' });
    const sub = await subtaskService.createSubtask(task.id, 'MCP Subtask');

    const mcp = createMcpServer();
    // @ts-ignore
    const handler = mcp._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    assert(!!handler, 'MCP CallTool handler must exist');

    // Test 1: Inversion
    const invRes = await handler({
      method: 'tools/call',
      params: {
        name: 'toggle_subtask',
        arguments: { id: sub.id },
      },
    });
    assert(
      invRes.content[0].text.includes('marcada como concluída'),
      `Expected marked as concluída, got: ${invRes.content[0].text}`
    );

    // Test 2: Explicit false
    const expFalseRes = await handler({
      method: 'tools/call',
      params: {
        name: 'toggle_subtask',
        arguments: { id: sub.id, isDone: false },
      },
    });
    assert(
      expFalseRes.content[0].text.includes('marcada como pendente'),
      `Expected marked as pendente, got: ${expFalseRes.content[0].text}`
    );

    // Test 3: Missing id throws
    let missingIdThrew = false;
    try {
      await handler({
        method: 'tools/call',
        params: {
          name: 'toggle_subtask',
          arguments: {},
        },
      });
    } catch {
      missingIdThrew = true;
    }
    assert(missingIdThrew, 'MCP toggle_subtask without id must throw');

    // Test 4: Non-existent id throws NotFound
    let notFoundThrew = false;
    try {
      await handler({
        method: 'tools/call',
        params: {
          name: 'toggle_subtask',
          arguments: { id: '00000000-0000-0000-0000-000000000000' },
        },
      });
    } catch (e: any) {
      notFoundThrew = true;
      assert(e.message.includes('Subtask not found') || e.name === 'NotFoundError', 'Should throw NotFoundError');
    }
    assert(notFoundThrew, 'MCP toggle_subtask with non-existent id must throw');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  // =========================================================================
  // SUITE 3: SUBTASK CREATION & DIRECT DELETION ADVERSARIAL CASES
  // =========================================================================
  console.log('\n--- SUITE 3: SUBTASK CREATION & DIRECT DELETION ---');

  await runAdversarialTest('SubtaskOps', '3.1: Subtask creation rejection on invalid input', async () => {
    const task = await taskService.createTask({ title: '[ADV-3.1] Task', category: 'PROJECT' });

    // Empty title
    const emptyRes = await request('POST', `/api/tasks/${task.id}/subtasks`, { title: '' });
    assert(emptyRes.status === 400, `Expected 400 for empty title, got ${emptyRes.status}`);

    // Whitespace title
    const wsRes = await request('POST', `/api/tasks/${task.id}/subtasks`, { title: '    ' });
    assert(wsRes.status === 400, `Expected 400 for whitespace title, got ${wsRes.status}`);

    // Non-existent task ID
    const noTaskRes = await request('POST', `/api/tasks/00000000-0000-0000-0000-000000000000/subtasks`, {
      title: 'Valid Subtask Title',
    });
    assert(noTaskRes.status === 404, `Expected 404 for non-existent task, got ${noTaskRes.status}`);

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('SubtaskOps', '3.2: Direct subtask deletion without parent deletion', async () => {
    const task = await taskService.createTask({ title: '[ADV-3.2] Direct Delete', category: 'PROJECT' });
    const sub1 = await subtaskService.createSubtask(task.id, 'Keep Subtask');
    const sub2 = await subtaskService.createSubtask(task.id, 'Delete Subtask');

    // Delete subtask 2 directly
    const delRes = await request('DELETE', `/api/subtasks/${sub2.id}`);
    assert(delRes.status === 204, `Expected 204 for subtask delete, got ${delRes.status}`);

    // Verify subtask 2 is gone
    const checkSub2 = await prisma.subtask.findUnique({ where: { id: sub2.id } });
    assert(checkSub2 === null, 'Subtask 2 must be deleted');

    // Verify parent task still exists
    const checkParent = await prisma.task.findUnique({
      where: { id: task.id },
      include: { subtasks: true },
    });
    assert(checkParent !== null, 'Parent task must NOT be deleted');
    assert(checkParent!.subtasks.length === 1, 'Parent task must retain subtask 1');
    assert(checkParent!.subtasks[0].id === sub1.id, 'Retained subtask must be subtask 1');

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('SubtaskOps', '3.3: Delete non-existent subtask returns 404', async () => {
    const nonExistentSubId = '00000000-0000-0000-0000-000000000000';
    const res = await request('DELETE', `/api/subtasks/${nonExistentSubId}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.data?.error === 'Subtask not found', `Expected 'Subtask not found', got ${res.data?.error}`);
  });

  await runAdversarialTest('SubtaskOps', '3.4: Double direct subtask delete race condition', async () => {
    const task = await taskService.createTask({ title: '[ADV-3.4] Double Sub Delete', category: 'PROJECT' });
    const sub = await subtaskService.createSubtask(task.id, 'Race Delete Subtask');

    const [res1, res2] = await Promise.all([
      request('DELETE', `/api/subtasks/${sub.id}`),
      request('DELETE', `/api/subtasks/${sub.id}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert(
      statuses[0] === 204 && statuses[1] === 404,
      `Expected one 204 and one 404, got: ${statuses.join(', ')}`
    );

    // Cleanup
    await taskService.deleteTask(task.id);
  });

  // =========================================================================
  // SUITE 4: EXTREME PAYLOAD & INJECTION RESILIENCE
  // =========================================================================
  console.log('\n--- SUITE 4: EXTREME PAYLOAD & INJECTION RESILIENCE ---');

  await runAdversarialTest('Resilience', '4.1: Subtask creation with 2,000 character title', async () => {
    const task = await taskService.createTask({ title: '[ADV-4.1] Long Title Task', category: 'PROJECT' });
    const longTitle = 'Subtask-' + 'A'.repeat(2000);
    const subRes = await request('POST', `/api/tasks/${task.id}/subtasks`, { title: longTitle });
    assert(subRes.status === 201, `Expected 201 for long title, got ${subRes.status}`);
    assert(subRes.data.title === longTitle, 'Title must be preserved exactly');

    // Clean up
    await taskService.deleteTask(task.id);
  });

  await runAdversarialTest('Resilience', '4.2: SQLi and XSS injection payload safety in subtasks', async () => {
    const task = await taskService.createTask({ title: '[ADV-4.2] Injection Safety', category: 'PROJECT' });
    const sqliTitle = `'; DROP TABLE "Subtask"; SELECT * FROM "Task" WHERE ''='`;
    const xssTitle = `<script>alert('pwned')</script><img src=x onerror=alert(1)>`;

    const sub1 = await request('POST', `/api/tasks/${task.id}/subtasks`, { title: sqliTitle });
    const sub2 = await request('POST', `/api/tasks/${task.id}/subtasks`, { title: xssTitle });
    assert(sub1.status === 201, 'SQLi payload should be stored safely as literal string');
    assert(sub2.status === 201, 'XSS payload should be stored safely as literal string');

    assert(sub1.data.title === sqliTitle, 'SQLi string must match verbatim');
    assert(sub2.data.title === xssTitle, 'XSS string must match verbatim');

    // Confirm database table still exists and is healthy
    const checkTable: any[] = await prisma.$queryRaw`SELECT count(*)::int as cnt FROM "Task"`;
    assert(checkTable[0]?.cnt > 0, 'Database table must remain intact');

    // Clean up
    await taskService.deleteTask(task.id);
  });

  // =========================================================================
  // SUITE 5: CROSS-RACE CONDITIONS (SUBTASK OPS VS PARENT DELETION)
  // =========================================================================
  console.log('\n--- SUITE 5: CROSS-RACE CONDITIONS ---');

  await runAdversarialTest('Races', '5.1: Race: Add Subtask while Parent Task is Deleted', async () => {
    const task = await taskService.createTask({ title: '[ADV-5.1] Race Add/Delete', category: 'COLLEGE' });

    // Concurrently trigger delete task and multiple add subtask requests
    const [delRes, addRes1, addRes2] = await Promise.all([
      request('DELETE', `/api/tasks/${task.id}`),
      request('POST', `/api/tasks/${task.id}/subtasks`, { title: 'Concurrent Sub 1' }),
      request('POST', `/api/tasks/${task.id}/subtasks`, { title: 'Concurrent Sub 2' }),
    ]);

    // Deletion should succeed
    assert(delRes.status === 204, `Delete must succeed with 204, got ${delRes.status}`);

    // Add subtasks must either:
    // a) succeed before delete (201) and then be cascaded, OR
    // b) fail after/during delete with 404 (Task not found)
    for (const addRes of [addRes1, addRes2]) {
      assert(
        addRes.status === 201 || addRes.status === 404,
        `Add subtask race must return 201 or 404, got ${addRes.status}`
      );
    }

    // In ALL cases: zero orphaned subtasks for this task ID in the database!
    const orphans = await prisma.subtask.findMany({ where: { taskId: task.id } });
    assert(orphans.length === 0, `Expected 0 orphans after race, found ${orphans.length}`);
  });

  await runAdversarialTest('Races', '5.2: Race: Toggle Subtask while Parent Task is Deleted', async () => {
    const task = await taskService.createTask({ title: '[ADV-5.2] Race Toggle/Delete', category: 'PERSONAL' });
    const sub = await subtaskService.createSubtask(task.id, 'Race Toggle Sub');

    // Concurrently trigger delete task and toggle subtask
    const [delRes, toggleRes] = await Promise.all([
      request('DELETE', `/api/tasks/${task.id}`),
      request('PATCH', `/api/subtasks/${sub.id}`, {}),
    ]);

    assert(delRes.status === 204, 'Delete must succeed with 204');
    // Toggle must either succeed before cascade (200) or report 404
    assert(
      toggleRes.status === 200 || toggleRes.status === 404,
      `Toggle race must return 200 or 404, got ${toggleRes.status}`
    );

    // Final state: subtask must not exist in DB
    const finalSub = await prisma.subtask.findUnique({ where: { id: sub.id } });
    assert(finalSub === null, 'Subtask must be completely gone');
  });

  // =========================================================================
  // SUITE 6: QUERY INTEGRITY UNDER SUBTASK VOLUME
  // =========================================================================
  console.log('\n--- SUITE 6: QUERY INTEGRITY UNDER SUBTASK VOLUME ---');

  await runAdversarialTest('Volume', '6.1: Query task with 50 subtasks via REST GET endpoints', async () => {
    const task = await taskService.createTask({ title: '[ADV-6.1] Volume 50 Subtasks', category: 'PROJECT' });

    // Batch create 50 subtasks
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        subtaskService.createSubtask(task.id, `Volume Subtask #${i + 1}`)
      )
    );

    // Query via GET /api/tasks/:id
    const getRes = await request('GET', `/api/tasks/${task.id}`);
    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assert(getRes.data.subtasks.length === 50, `Expected 50 subtasks, got ${getRes.data.subtasks.length}`);

    // Query via GET /api/tasks
    const listRes = await request('GET', '/api/tasks');
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    const found = listRes.data.find((t: any) => t.id === task.id);
    assert(!!found, 'Task must appear in task list');
    assert(found.subtasks.length === 50, `Expected 50 subtasks in list, got ${found.subtasks.length}`);

    // Clean up
    await taskService.deleteTask(task.id);
    const orphans = await prisma.subtask.findMany({ where: { taskId: task.id } });
    assert(orphans.length === 0, 'All 50 subtasks must be cleanly cascaded');
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;

  console.log(`Total Scenarios Executed: ${total}`);
  console.log(`Passed:                  ${passed}`);
  console.log(`Failed:                  ${failed}`);
  console.log(`Pass Rate:               ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Scenarios:');
    testResults
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(` - [${t.suite}] ${t.name}: ${t.error}`);
      });
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Fatal crash in adversarial test harness:', e);
  await prisma.$disconnect();
  process.exit(1);
});
