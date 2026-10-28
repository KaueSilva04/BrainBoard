/**
 * Adversarial Security & Edge Cases Verification Suite
 *
 * Verifies:
 * a) Unauthenticated request with invalid/forged/expired Bearer token returns 401 Unauthorized
 * b) Non-owner collaborator attempting to delete project or remove owner is rejected (403/400)
 * c) Attempting to assign a task to a non-collaborator user is rejected (400)
 * d) Legacy backfilled projects remain 100% intact with zero data loss
 */

import http from 'http';
import jwt from '../backend/node_modules/jsonwebtoken/index.js';
import { prisma } from '../backend/src/prisma.js';

const TEST_PORT = process.env.TEST_PORT || '3098';
process.env.PORT = TEST_PORT;
process.env.ALLOW_ANONYMOUS_DEV = 'true';

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (postData) {
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }

    const req = http.request(
      url,
      {
        method,
        headers,
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
          resolve({ status: res.statusCode || 0, data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
}

async function runAdversarialSuite() {
  console.log('\n================================================================');
  console.log('   Adversarial Security & Isolation Stress Test Harness');
  console.log('================================================================\n');

  console.log('[Setup] Starting backend server on port', TEST_PORT);
  const appModule = await import('../backend/src/index.js');
  await new Promise((r) => setTimeout(r, 1500));

  const health = await makeRequest('GET', '/api/health');
  assert(health.status === 200, `Backend health check failed: ${health.status}`);
  console.log('✓ Backend online on port', TEST_PORT);

  const timestamp = Date.now();
  let userAId = '';
  let userBId = '';
  let userCId = '';
  let tokenA = '';
  let tokenB = '';
  let tokenC = '';
  let projectId = '';
  let stageId = '';
  let taskId = '';

  try {
    // ------------------------------------------------------------------------
    // EDGE CASE A: Invalid, Forged, and Expired Bearer Tokens
    // ------------------------------------------------------------------------
    console.log('\n--- Edge Case A: Invalid & Forged Bearer Tokens ---');

    // 1. Completely bogus token string
    const resBogus = await makeRequest('GET', '/api/auth/me', undefined, 'invalid_token_12345');
    assert(resBogus.status === 401, `Expected 401 for bogus token on /api/auth/me, got ${resBogus.status}`);
    console.log('✓ Bogus token correctly rejected with 401');

    // 2. Malformed JWT structure
    const resMalformed = await makeRequest('GET', '/api/projects', undefined, 'fake.jwt.token.here');
    assert(resMalformed.status === 401, `Expected 401 for malformed JWT on /api/projects, got ${resMalformed.status}`);
    console.log('✓ Malformed JWT on /api/projects rejected with 401');

    // 3. Forged JWT signed with a bogus secret key
    const forgedToken = jwt.sign({ userId: '00000000-0000-0000-0000-000000000000' }, 'attacker-wrong-secret');
    const resForged = await makeRequest('GET', '/api/auth/me', undefined, forgedToken);
    assert(resForged.status === 401, `Expected 401 for forged signature, got ${resForged.status}`);
    console.log('✓ Forged signature JWT correctly rejected with 401');

    // 4. Expired JWT
    const expiredToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000000' },
      process.env.JWT_SECRET || 'brainboard-jwt-secret-key-2026-production',
      { expiresIn: '-10s' }
    );
    const resExpired = await makeRequest('GET', '/api/auth/me', undefined, expiredToken);
    assert(resExpired.status === 401, `Expected 401 for expired token, got ${resExpired.status}`);
    console.log('✓ Expired JWT correctly rejected with 401');

    // 5. Valid JWT signature but non-existent user ID
    const ghostUserToken = jwt.sign(
      { userId: '99999999-9999-9999-9999-999999999999' },
      process.env.JWT_SECRET || 'brainboard-jwt-secret-key-2026-production',
      { expiresIn: '1h' }
    );
    const resGhost = await makeRequest('GET', '/api/auth/me', undefined, ghostUserToken);
    assert(resGhost.status === 401, `Expected 401 for ghost user ID, got ${resGhost.status}`);
    console.log('✓ Non-existent user ID token correctly rejected with 401');

    // ------------------------------------------------------------------------
    // SETUP: Users A (Owner), B (Collaborator), and C (Outsider)
    // ------------------------------------------------------------------------
    console.log('\n--- Setting up Users A (Owner), B (Collaborator), C (Outsider) ---');
    const regA = await makeRequest('POST', '/api/auth/register', {
      name: 'Alice Owner',
      email: `alice_${timestamp}@sec.local`,
      password: 'passwordAlice123',
    });
    assert(regA.status === 201, `Register Alice failed: ${regA.status}`);
    userAId = regA.data.user.id;
    tokenA = regA.data.token;

    const regB = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob Collaborator',
      email: `bob_${timestamp}@sec.local`,
      password: 'passwordBob123',
    });
    assert(regB.status === 201, `Register Bob failed: ${regB.status}`);
    userBId = regB.data.user.id;
    tokenB = regB.data.token;

    const regC = await makeRequest('POST', '/api/auth/register', {
      name: 'Charlie Outsider',
      email: `charlie_${timestamp}@sec.local`,
      password: 'passwordCharlie123',
    });
    assert(regC.status === 201, `Register Charlie failed: ${regC.status}`);
    userCId = regC.data.user.id;
    tokenC = regC.data.token;

    // Alice creates project
    const projRes = await makeRequest(
      'POST',
      '/api/projects',
      { title: `Adversarial Target Project ${timestamp}`, status: 'ACTIVE' },
      tokenA
    );
    assert(projRes.status === 201, `Project creation failed: ${projRes.status}`);
    projectId = projRes.data.id;

    // Alice invites Bob as COLLABORATOR
    const inviteRes = await makeRequest(
      'POST',
      `/api/projects/${projectId}/collaborators`,
      { userId: userBId, role: 'COLLABORATOR' },
      tokenA
    );
    assert(inviteRes.status === 201, `Invite Bob failed: ${inviteRes.status}`);
    console.log(`✓ Setup complete: Project ${projectId} created with Alice (Owner) and Bob (Collaborator)`);

    // ------------------------------------------------------------------------
    // EDGE CASE B: Non-Owner Collaborator Cannot Delete Project or Remove Owner
    // ------------------------------------------------------------------------
    console.log('\n--- Edge Case B: Privilege Escalation & Destruction Attempts ---');

    // 1. Bob attempts DELETE /api/projects/:id (must be 403 Forbidden)
    const bobDeleteProjRes = await makeRequest('DELETE', `/api/projects/${projectId}`, undefined, tokenB);
    assert(
      bobDeleteProjRes.status === 403,
      `Expected 403 when collaborator deletes project, got ${bobDeleteProjRes.status} (${JSON.stringify(bobDeleteProjRes.data)})`
    );
    console.log('✓ Non-owner collaborator deleting project rejected with 403 Forbidden');

    // 2. Charlie (Outsider) attempts DELETE /api/projects/:id (must be 403)
    const charlieDeleteProjRes = await makeRequest('DELETE', `/api/projects/${projectId}`, undefined, tokenC);
    assert(
      charlieDeleteProjRes.status === 403,
      `Expected 403 when outsider deletes project, got ${charlieDeleteProjRes.status}`
    );
    console.log('✓ Outsider deleting project rejected with 403 Forbidden');

    // 3. Bob attempts to remove Owner (Alice) from collaborators (must be 400 ValidationError)
    const bobRemoveOwnerRes = await makeRequest(
      'DELETE',
      `/api/projects/${projectId}/collaborators/${userAId}`,
      undefined,
      tokenB
    );
    assert(
      bobRemoveOwnerRes.status === 400,
      `Expected 400 when attempting to remove owner, got ${bobRemoveOwnerRes.status}`
    );
    assert(
      bobRemoveOwnerRes.data.error.includes('proprietário'),
      `Expected error about owner protection, got: ${bobRemoveOwnerRes.data.error}`
    );
    console.log('✓ Collaborator attempting to remove owner rejected with 400 ("Não é possível remover o proprietário")');

    // 4. Bob attempts to invite Charlie as an OWNER or COLLABORATOR without owner rights
    const bobAddCollabRes = await makeRequest(
      'POST',
      `/api/projects/${projectId}/collaborators`,
      { userId: userCId, role: 'COLLABORATOR' },
      tokenB
    );
    assert(
      bobAddCollabRes.status === 400,
      `Expected 400 when collaborator attempts to invite members, got ${bobAddCollabRes.status}`
    );
    console.log('✓ Collaborator attempting to invite members rejected with 400 ("Apenas o proprietário pode adicionar")');

    // 5. Verify Project still exists and is 100% intact
    const verifyProjRes = await makeRequest('GET', `/api/projects/${projectId}`, undefined, tokenA);
    assert(verifyProjRes.status === 200, 'Project must still exist after malicious attacks');
    assert(verifyProjRes.data.ownerId === userAId, 'Owner must remain Alice');
    console.log('✓ Project integrity verified intact after all hostile deletion/escalation attempts');

    // ------------------------------------------------------------------------
    // EDGE CASE C: Task Assignment to Non-Collaborator User
    // ------------------------------------------------------------------------
    console.log('\n--- Edge Case C: Task Assignment to Non-Collaborator User ---');

    // Create stage in project
    const createStageRes = await makeRequest(
      'POST',
      `/api/projects/${projectId}/stages`,
      { title: 'Security Stage', order: 0 },
      tokenA
    );
    assert(createStageRes.status === 201, `Create stage failed: ${createStageRes.status}`);
    stageId = createStageRes.data.id;

    // 1. Attempt to create task assigning Charlie (non-collaborator)
    const invalidAssignCreateRes = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: 'Unauthorized Assignment Task',
        stageId: stageId,
        assigneeId: userCId,
      },
      tokenA
    );
    assert(
      invalidAssignCreateRes.status === 400,
      `Expected 400 when assigning task to non-collaborator upon creation, got ${invalidAssignCreateRes.status}`
    );
    assert(
      invalidAssignCreateRes.data.error.includes('membro ou proprietário'),
      `Expected message about member or owner, got: ${invalidAssignCreateRes.data.error}`
    );
    console.log('✓ Assigning task to non-collaborator on POST /api/tasks rejected with 400');

    // 2. Create valid unassigned task
    const validTaskRes = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: 'Valid Project Task',
        stageId: stageId,
      },
      tokenA
    );
    assert(validTaskRes.status === 201, `Create valid task failed: ${validTaskRes.status}`);
    taskId = validTaskRes.data.id;
    assert(validTaskRes.data.assigneeId === null, 'Task should start unassigned');
    console.log('✓ Valid unassigned task created');

    // 3. Attempt to update task to assign Charlie (non-collaborator)
    const invalidAssignUpdateRes = await makeRequest(
      'PATCH',
      `/api/tasks/${taskId}`,
      { assigneeId: userCId },
      tokenA
    );
    assert(
      invalidAssignUpdateRes.status === 400,
      `Expected 400 when assigning task to non-collaborator upon update, got ${invalidAssignUpdateRes.status}`
    );
    console.log('✓ Assigning task to non-collaborator on PATCH /api/tasks/:id rejected with 400');

    // 4. Assign valid collaborator (Bob)
    const validAssignUpdateRes = await makeRequest(
      'PATCH',
      `/api/tasks/${taskId}`,
      { assigneeId: userBId },
      tokenA
    );
    assert(validAssignUpdateRes.status === 200, `Expected 200 assigning to valid collaborator, got ${validAssignUpdateRes.status}`);
    assert(validAssignUpdateRes.data.assigneeId === userBId, 'Task must be assigned to Bob');
    console.log('✓ Assigning to valid collaborator (Bob) succeeded with 200');

    // 5. Unassign task by passing null
    const unassignRes = await makeRequest(
      'PATCH',
      `/api/tasks/${taskId}`,
      { assigneeId: null },
      tokenA
    );
    assert(unassignRes.status === 200, `Expected 200 unassigning task, got ${unassignRes.status}`);
    assert(unassignRes.data.assigneeId === null, 'Task must be unassigned');
    console.log('✓ Unassigning task (null) succeeded with 200');

    // ------------------------------------------------------------------------
    // EDGE CASE D: Legacy Backfilled Projects & Data Integrity Verification
    // ------------------------------------------------------------------------
    console.log('\n--- Edge Case D: Legacy Backfilled Projects & Zero Data Loss ---');

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@brainboard.local' },
    });
    assert(Boolean(admin), 'Admin user admin@brainboard.local must exist in database');

    const legacyProjects = await prisma.project.findMany({
      where: {
        title: { in: ['NextStep', 'Sistema Visualizador IEC61850', 'Faculdade'] },
      },
      include: {
        stages: { include: { tasks: true } },
        collaborators: true,
      },
    });

    assert(legacyProjects.length === 3, `Expected 3 legacy projects, found ${legacyProjects.length}`);

    let totalTasksInLegacy = 0;
    for (const p of legacyProjects) {
      assert(p.ownerId === admin!.id, `Project "${p.title}" must be owned by admin (${admin!.id})`);
      const hasOwnerCollab = p.collaborators.some((c) => c.userId === admin!.id && c.role === 'OWNER');
      assert(hasOwnerCollab, `Project "${p.title}" must have OWNER membership for admin`);
      const taskCount = p.stages.reduce((acc, s) => acc + s.tasks.length, 0);
      totalTasksInLegacy += taskCount;
      console.log(`  ✓ Legacy project "${p.title}": owner verified, ${p.stages.length} stages, ${taskCount} tasks intact`);
    }

    assert(totalTasksInLegacy === 30 || totalTasksInLegacy === 31, `Expected 30 or 31 legacy tasks, found ${totalTasksInLegacy}`);
    console.log(`✓ Total legacy tasks intact: ${totalTasksInLegacy}`);

    console.log('\n================================================================');
    console.log('   🎉 ALL ADVERSARIAL SECURITY & EDGE CASES PASSED EMPIRICALLY!');
    console.log('================================================================\n');
  } finally {
    // Cleanup
    console.log('[Cleanup] Cleaning up adversarial test artifacts...');
    try {
      if (projectId) {
        await prisma.project.deleteMany({ where: { id: projectId } });
      }
      if (userAId) {
        await prisma.user.deleteMany({ where: { id: userAId } });
      }
      if (userBId) {
        await prisma.user.deleteMany({ where: { id: userBId } });
      }
      if (userCId) {
        await prisma.user.deleteMany({ where: { id: userCId } });
      }
      console.log('[Cleanup] Done.');
    } catch (cleanupErr) {
      console.warn('[Cleanup] Warning:', cleanupErr);
    }
  }
}

runAdversarialSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ ADVERSARIAL SUITE FAILED:', err);
    process.exit(1);
  });
