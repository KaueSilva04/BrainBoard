/**
 * Challenger M2-4-1: Deep Adversarial Test for MCP Tool `add_to_sprint`
 *
 * Scenarios tested:
 * 1. Unauthenticated invocation (userId = undefined) -> strictly throws 'Usuário não autenticado para modificar Sprint via MCP', NO mutation.
 * 2. Authenticated non-member (Bob) -> strictly throws 'Acesso negado: você não é proprietário nem colaborador deste projeto', NO mutation.
 * 3. Authenticated collaborator (Charlie) -> successfully adds to sprint (isSprintActive: true).
 * 4. Authenticated owner (Alice) -> successfully toggles sprint (isSprintActive: false).
 * 5. Non-existent taskId with valid user -> strictly throws 'Tarefa não encontrada'.
 * 6. Empty taskId with valid user -> strictly throws 'taskId é obrigatório'.
 */
import { prisma } from '../backend/src/prisma.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';

async function main() {
  console.log('--- Challenger Deep Adversarial Test for add_to_sprint ---');
  let failures = 0;
  let totalTests = 0;

  function record(desc: string, passed: boolean, detail?: string) {
    totalTests++;
    if (passed) {
      console.log(`✅ PASS: ${desc}`);
    } else {
      failures++;
      console.error(`❌ FAIL: ${desc} - Detail: ${detail}`);
    }
  }

  const timestamp = Date.now();
  const alice = await prisma.user.create({
    data: {
      email: `alice_sprint_${timestamp}@test.local`,
      name: 'Alice Owner',
      passwordHash: 'dummy',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: `bob_sprint_${timestamp}@test.local`,
      name: 'Bob NonMember',
      passwordHash: 'dummy',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: `charlie_sprint_${timestamp}@test.local`,
      name: 'Charlie Member',
      passwordHash: 'dummy',
    },
  });

  const project = await prisma.project.create({
    data: {
      title: 'Sprint Isolation Test Project',
      ownerId: alice.id,
    },
  });

  // Add Charlie as a collaborator
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: charlie.id,
      role: 'COLLABORATOR',
    },
  });

  const stage = await prisma.stage.create({
    data: {
      projectId: project.id,
      title: 'Backlog Stage',
    },
  });

  const task = await prisma.task.create({
    data: {
      stageId: stage.id,
      title: 'Confidential Sprint Task',
      isSprintActive: false,
    },
  });

  try {
    // 1. Unauthenticated invocation (userId = undefined)
    try {
      await handleM2Tools('add_to_sprint', { taskId: task.id, isSprintActive: true }, undefined);
      record('Unauthenticated invocation must throw error', false, 'Did not throw');
    } catch (err: any) {
      const isExpectedError = err.message.includes('Usuário não autenticado para modificar Sprint via MCP');
      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      const notMutated = dbTask?.isSprintActive === false;
      record(
        'Unauthenticated invocation strictly rejected with auth error and does NOT mutate task',
        isExpectedError && notMutated,
        `Error: ${err.message}, isSprintActive: ${dbTask?.isSprintActive}`
      );
    }

    // 2. Authenticated non-member (Bob)
    try {
      await handleM2Tools('add_to_sprint', { taskId: task.id, isSprintActive: true }, bob.id);
      record('Authenticated non-member must throw "Acesso negado"', false, 'Did not throw');
    } catch (err: any) {
      const isDenied = err.message.includes('Acesso negado');
      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      const notMutated = dbTask?.isSprintActive === false;
      record(
        'Authenticated non-member strictly rejected with "Acesso negado" and does NOT mutate task',
        isDenied && notMutated,
        `Error: ${err.message}, isSprintActive: ${dbTask?.isSprintActive}`
      );
    }

    // 3. Authenticated collaborator (Charlie)
    try {
      const resCharlie = await handleM2Tools('add_to_sprint', { taskId: task.id, isSprintActive: true }, charlie.id);
      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      const mutated = dbTask?.isSprintActive === true;
      record(
        'Authenticated collaborator (Charlie) successfully adds task to sprint',
        mutated && !!resCharlie,
        `isSprintActive: ${dbTask?.isSprintActive}`
      );
    } catch (err: any) {
      record('Authenticated collaborator (Charlie) successfully adds task to sprint', false, err.message);
    }

    // 4. Authenticated owner (Alice)
    try {
      const resAlice = await handleM2Tools('add_to_sprint', { taskId: task.id, isSprintActive: false }, alice.id);
      const dbTask = await prisma.task.findUnique({ where: { id: task.id } });
      const mutatedBack = dbTask?.isSprintActive === false;
      record(
        'Authenticated owner (Alice) successfully removes task from sprint',
        mutatedBack && !!resAlice,
        `isSprintActive: ${dbTask?.isSprintActive}`
      );
    } catch (err: any) {
      record('Authenticated owner (Alice) successfully removes task from sprint', false, err.message);
    }

    // 5. Non-existent taskId with valid user
    try {
      await handleM2Tools('add_to_sprint', { taskId: 'non-existent-task-id', isSprintActive: true }, alice.id);
      record('Non-existent taskId must throw "Tarefa não encontrada"', false, 'Did not throw');
    } catch (err: any) {
      const isExpected = err.message.includes('Tarefa não encontrada');
      record('Non-existent taskId throws "Tarefa não encontrada"', isExpected, err.message);
    }

    // 6. Empty taskId with valid user
    try {
      await handleM2Tools('add_to_sprint', { taskId: '', isSprintActive: true }, alice.id);
      record('Empty taskId must throw "taskId é obrigatório"', false, 'Did not throw');
    } catch (err: any) {
      const isExpected = err.message.includes('taskId é obrigatório');
      record('Empty taskId throws "taskId é obrigatório"', isExpected, err.message);
    }

  } finally {
    // Teardown
    await prisma.task.deleteMany({ where: { id: task.id } });
    await prisma.stage.deleteMany({ where: { id: stage.id } });
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    await prisma.project.deleteMany({ where: { id: project.id } });
    await prisma.user.deleteMany({ where: { id: { in: [alice.id, bob.id, charlie.id] } } });
  }

  console.log(`\nSummary: ${totalTests - failures}/${totalTests} tests passed.`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test failed with uncaught exception:', err);
  process.exit(2);
});
