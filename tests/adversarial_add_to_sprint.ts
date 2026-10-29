/**
 * Empirical Adversarial Test for MCP Tool: add_to_sprint
 * Verifies that unauthenticated invocation (userId = undefined) is strictly rejected with an error.
 */
import { prisma } from '../backend/src/prisma.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';

async function main() {
  const alice = await prisma.user.create({
    data: {
      email: `alice_test_${Date.now()}@test.local`,
      name: 'Alice',
      passwordHash: 'dummy',
    },
  });

  const project = await prisma.project.create({
    data: {
      title: 'Alice Private Project',
      ownerId: alice.id,
    },
  });

  const stage = await prisma.stage.create({
    data: {
      projectId: project.id,
      title: 'Backlog',
    },
  });

  const task = await prisma.task.create({
    data: {
      stageId: stage.id,
      title: 'Alice Sensitive Task',
      isSprintActive: false,
    },
  });

  let vulnerabilityReproduced = false;

  try {
    const res = await handleM2Tools('add_to_sprint', { taskId: task.id, isSprintActive: true }, undefined);
    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    
    if (updatedTask?.isSprintActive === true) {
      vulnerabilityReproduced = true;
      console.error('❌ SECURITY VULNERABILITY REPRODUCED:');
      console.error('   handleM2Tools("add_to_sprint") executed with userId = undefined, bypassed access control, and mutated Alice\'s private task in DB!');
      console.error('   Response returned to unauthenticated caller:', JSON.stringify(res, null, 2));
    }
  } catch (err: any) {
    console.log('✅ PASS: handleM2Tools("add_to_sprint", userId=undefined) was strictly rejected with error:', err.message);
  } finally {
    await prisma.task.deleteMany({ where: { id: task.id } });
    await prisma.stage.deleteMany({ where: { id: stage.id } });
    await prisma.project.deleteMany({ where: { id: project.id } });
    await prisma.user.deleteMany({ where: { id: alice.id } });
  }

  if (vulnerabilityReproduced) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(2);
});
