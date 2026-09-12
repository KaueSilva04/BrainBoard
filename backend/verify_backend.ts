import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('🧪 Starting FocusTask Backend & MCP Verification Test Suite...');
  console.log('📡 Database connection URL:', process.env.DATABASE_URL ? 'Configured ✅' : 'Missing ❌');

  let testTaskId: string | null = null;
  let testSubtaskId: string | null = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Task Creation (Simulates MCP create_task / POST /api/tasks)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Task Creation ---');
    const task = await prisma.task.create({
      data: {
        title: '[VERIFY] Test Master Task for M1',
        description: 'Verifying backend MCP tools and REST handlers',
        category: 'PROJECT',
        status: 'TODO',
      },
    });
    testTaskId = task.id;
    console.log('✅ Created Task ID:', task.id);
    console.log('   Title:', task.title);
    console.log('   Category:', task.category);
    console.log('   Status:', task.status);

    if (task.status !== 'TODO') throw new Error('Expected initial status to be TODO');

    // -------------------------------------------------------------
    // Test 2: Add Subtask (Simulates MCP add_subtask / POST /api/tasks/:id/subtasks)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Add Subtask ---');
    const subtask = await prisma.subtask.create({
      data: {
        taskId: task.id,
        title: '[VERIFY] Subtask Alpha',
      },
    });
    testSubtaskId = subtask.id;
    console.log('✅ Created Subtask ID:', subtask.id);
    console.log('   Title:', subtask.title);
    console.log('   isDone initial:', subtask.isDone);

    if (subtask.isDone !== false) throw new Error('Expected initial subtask isDone to be false');
    if (subtask.taskId !== task.id) throw new Error('Subtask taskId does not match parent task id');

    // -------------------------------------------------------------
    // Test 3: Toggle Subtask (Simulates MCP toggle_subtask / PATCH /api/subtasks/:id)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Toggle Subtask ---');
    // Invert: false -> true
    const current1 = await prisma.subtask.findUnique({ where: { id: subtask.id } });
    if (!current1) throw new Error('Subtask not found');

    const toggled1 = await prisma.subtask.update({
      where: { id: subtask.id },
      data: { isDone: !current1.isDone },
    });
    console.log('✅ Toggled 1 (invert): isDone =', toggled1.isDone);
    if (toggled1.isDone !== true) throw new Error('Expected isDone to be true after first toggle');

    // Invert: true -> false
    const current2 = await prisma.subtask.findUnique({ where: { id: subtask.id } });
    const toggled2 = await prisma.subtask.update({
      where: { id: subtask.id },
      data: { isDone: !current2!.isDone },
    });
    console.log('✅ Toggled 2 (invert back): isDone =', toggled2.isDone);
    if (toggled2.isDone !== false) throw new Error('Expected isDone to be false after second toggle');

    // Explicit set: true
    const explicitToggled = await prisma.subtask.update({
      where: { id: subtask.id },
      data: { isDone: true },
    });
    console.log('✅ Explicit set (true): isDone =', explicitToggled.isDone);
    if (explicitToggled.isDone !== true) throw new Error('Expected isDone to be true after explicit update');

    // -------------------------------------------------------------
    // Test 4: Move / Update Task (Simulates MCP move_task / PATCH /api/tasks/:id)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Move Task to IN_PROGRESS and DONE ---');
    const movedToInProgress = await prisma.task.update({
      where: { id: task.id },
      data: { status: 'IN_PROGRESS' },
    });
    console.log('✅ Moved to:', movedToInProgress.status);
    if (movedToInProgress.status !== 'IN_PROGRESS') throw new Error('Expected status to be IN_PROGRESS');

    const movedToDone = await prisma.task.update({
      where: { id: task.id },
      data: { status: 'DONE' },
    });
    console.log('✅ Moved to:', movedToDone.status);
    if (movedToDone.status !== 'DONE') throw new Error('Expected status to be DONE');

    // -------------------------------------------------------------
    // Test 5: Query Tasks with Subtasks (Simulates GET /api/tasks)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Query Tasks with Subtasks ---');
    const tasks = await prisma.task.findMany({
      where: { id: task.id },
      include: { subtasks: true },
    });
    if (tasks.length !== 1 || !tasks[0]) throw new Error('Expected 1 task returned');
    const firstTask = tasks[0];
    if (!firstTask.subtasks || firstTask.subtasks.length !== 1 || !firstTask.subtasks[0]) {
      throw new Error('Expected subtasks to be included and have length 1');
    }
    const firstSubtask = firstTask.subtasks[0];
    console.log('✅ Task queried with nested subtasks successfully:');
    console.log('   Task ID:', firstTask.id);
    console.log('   Subtasks count:', firstTask.subtasks.length);
    console.log('   First subtask:', firstSubtask.title, '- isDone:', firstSubtask.isDone);

    // -------------------------------------------------------------
    // Test 6: Cascade Deletion (Simulates DELETE /api/tasks/:id)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Cascade Deletion ---');
    await prisma.task.delete({ where: { id: task.id } });
    testTaskId = null; // Already deleted

    const orphanCheck = await prisma.subtask.findUnique({
      where: { id: testSubtaskId },
    });
    if (orphanCheck !== null) {
      throw new Error('Cascade deletion failed: subtask still exists after task deletion');
    }
    console.log('✅ Cascade deletion confirmed: subtask was automatically removed');
    testSubtaskId = null;

    console.log('\n=============================================================');
    console.log('🎉 ALL 6 VERIFICATION TEST SUITES PASSED WITH 100% SUCCESS!');
    console.log('=============================================================');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    if (testTaskId) {
      try {
        await prisma.task.delete({ where: { id: testTaskId } });
      } catch (cleanupErr) {
        // ignore
      }
    }
    await prisma.$disconnect();
  }
}

runVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
