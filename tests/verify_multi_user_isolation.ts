/**
 * Programmatic Multi-User Isolation & Safe Backfill Verification Test Suite
 *
 * Verifies the 6 key requirements of Milestone 1:
 * 1) User A and User B registration & authentication tokens
 * 2) User A creates project -> User B cannot see it (multi-tenant isolation)
 * 3) User A invites User B -> User B can see it (collaborator access)
 * 4) Task assigned to User B returns assignee info
 * 5) User B removed -> access revoked and task unassigned (safe cleanup)
 * 6) 3 legacy projects claimed by admin@brainboard.local with zero data loss
 */

import http from 'http';
import { prisma } from '../backend/src/prisma.js';
import { ensureDefaultOwnerAndBackfill } from '../backend/src/services/backfill.service.js';

const TEST_PORT = process.env.TEST_PORT || '3099';
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

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('   BrainBoard Backend Multi-User Isolation & Backfill Test Suite');
  console.log('================================================================\n');

  // 0. Ensure server is running on TEST_PORT
  console.log('[Setup] Starting backend Express server on port', TEST_PORT);
  // Import index.js which initializes routes and backfill
  const appModule = await import('../backend/src/index.js');
  const app = appModule.default;

  // Wait 1.5 seconds for server startup and backfill to settle
  await new Promise((r) => setTimeout(r, 1500));

  // Health check
  const health = await makeRequest('GET', '/api/health');
  assert(health.status === 200, `Server health check failed: ${health.status}`);
  console.log('✓ Backend server responding on port', TEST_PORT);

  const timestamp = Date.now();
  const emailA = `alice_${timestamp}@test.local`;
  const emailB = `bob_${timestamp}@test.local`;
  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';
  let createdProjectId = '';
  let createdStageId = '';
  let createdTaskId = '';

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: User A & User B Registration, Tokens & Authentication
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 1: User Registration, Tokens & Session Validation ---');

    // Register User A
    const regARes = await makeRequest('POST', '/api/auth/register', {
      name: 'Alice Wonder',
      email: emailA,
      password: 'passwordAlice123',
    });
    assert(regARes.status === 201, `Failed to register User A: ${regARes.status} - ${JSON.stringify(regARes.data)}`);
    assert(Boolean(regARes.data.token), 'Registration A must return JWT token');
    assert(regARes.data.user.email === emailA, 'User A email must match');
    assert(Boolean(regARes.data.user.avatarColor), 'User A must have avatarColor');
    tokenA = regARes.data.token;
    userAId = regARes.data.user.id;
    console.log(`✓ User A registered successfully: ${userAId} (${emailA})`);

    // Register User B
    const regBRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob Builder',
      email: emailB,
      password: 'passwordBob123',
    });
    assert(regBRes.status === 201, `Failed to register User B: ${regBRes.status} - ${JSON.stringify(regBRes.data)}`);
    assert(Boolean(regBRes.data.token), 'Registration B must return JWT token');
    assert(regBRes.data.user.email === emailB, 'User B email must match');
    tokenB = regBRes.data.token;
    userBId = regBRes.data.user.id;
    console.log(`✓ User B registered successfully: ${userBId} (${emailB})`);

    // Test Login for User A
    const loginARes = await makeRequest('POST', '/api/auth/login', {
      email: emailA,
      password: 'passwordAlice123',
    });
    assert(loginARes.status === 200, `Login A failed: ${loginARes.status}`);
    assert(Boolean(loginARes.data.token), 'Login A must return JWT');
    console.log('✓ Login User A verified');

    // Test Invalid Login
    const loginFail = await makeRequest('POST', '/api/auth/login', {
      email: emailA,
      password: 'wrongPassword',
    });
    assert(loginFail.status === 401, `Expected 401 for wrong password, got ${loginFail.status}`);
    console.log('✓ Invalid password correctly rejected with 401');

    // Test /api/auth/me with User A token
    const meARes = await makeRequest('GET', '/api/auth/me', undefined, tokenA);
    assert(meARes.status === 200, `me A failed: ${meARes.status}`);
    assert(meARes.data.user.id === userAId, 'me A user id must match');
    console.log('✓ /api/auth/me for User A returns valid session');

    // Test /api/auth/me with User B token
    const meBRes = await makeRequest('GET', '/api/auth/me', undefined, tokenB);
    assert(meBRes.status === 200, `me B failed: ${meBRes.status}`);
    assert(meBRes.data.user.id === userBId, 'me B user id must match');
    console.log('✓ /api/auth/me for User B returns valid session');

    // Test /api/users/search
    const searchRes = await makeRequest('GET', `/api/users/search?q=Bob`, undefined, tokenA);
    assert(searchRes.status === 200, `Search failed: ${searchRes.status}`);
    const foundBob = searchRes.data.find((u: any) => u.id === userBId);
    assert(Boolean(foundBob), 'Search by query "Bob" must find User B');
    console.log('✓ User search for collaborator discovery verified');

    // ------------------------------------------------------------------------
    // SCENARIO 2: Project Creation & Multi-Tenant User Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Project Scoping & Isolation ---');

    // User A creates project
    const createProjRes = await makeRequest(
      'POST',
      '/api/projects',
      {
        title: `Project Alice Alpha ${timestamp}`,
        description: 'Classified project by Alice',
        status: 'ACTIVE',
      },
      tokenA
    );
    assert(createProjRes.status === 201, `Project creation failed: ${createProjRes.status}`);
    createdProjectId = createProjRes.data.id;
    assert(createProjRes.data.ownerId === userAId, `Project ownerId must be ${userAId}`);
    assert(
      createProjRes.data.collaborators?.some((c: any) => c.userId === userAId && c.role === 'OWNER'),
      'Project must include owner as OWNER collaborator'
    );
    console.log(`✓ Project created by User A: ${createdProjectId}`);

    // User A lists projects -> Project must be present
    const listARes = await makeRequest('GET', '/api/projects', undefined, tokenA);
    assert(listARes.status === 200, `List A failed: ${listARes.status}`);
    const aSeesProject = listARes.data.some((p: any) => p.id === createdProjectId);
    assert(aSeesProject, 'User A must see the project she created');
    console.log('✓ User A sees her project in GET /api/projects');

    // User B lists projects -> Project must NOT be present!
    const listBRes = await makeRequest('GET', '/api/projects', undefined, tokenB);
    assert(listBRes.status === 200, `List B failed: ${listBRes.status}`);
    const bSeesProject = listBRes.data.some((p: any) => p.id === createdProjectId);
    assert(!bSeesProject, 'ISOLATION FAILURE: User B can see User A project before being invited!');
    console.log('✓ Multi-tenant isolation verified: User B DOES NOT see User A project');

    // User B attempts direct GET /api/projects/:id -> must be 404 (access denied)
    const getBProjRes = await makeRequest('GET', `/api/projects/${createdProjectId}`, undefined, tokenB);
    assert(getBProjRes.status === 404, `Expected 404 for uninvited project view, got ${getBProjRes.status}`);
    console.log('✓ User B direct access to project correctly denied (404)');

    // User B dashboard overview -> project must not be included
    const fromIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const toIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const dashBRes = await makeRequest(
      'GET',
      `/api/dashboard/overview?from=${fromIso}&to=${toIso}`,
      undefined,
      tokenB
    );
    assert(dashBRes.status === 200, `Dashboard overview failed: ${dashBRes.status}`);
    const dashBHasProject = dashBRes.data.projects?.some((p: any) => p.id === createdProjectId);
    assert(!dashBHasProject, 'User B dashboard overview must not include uninvited projects');
    console.log('✓ User B dashboard overview properly scoped');

    // ------------------------------------------------------------------------
    // SCENARIO 3: User A Invites User B as Collaborator
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Project Collaborator Invitation ---');

    // User A invites User B
    const addCollabRes = await makeRequest(
      'POST',
      `/api/projects/${createdProjectId}/collaborators`,
      {
        email: emailB,
        role: 'COLLABORATOR',
      },
      tokenA
    );
    assert(addCollabRes.status === 201, `Add collaborator failed: ${addCollabRes.status}`);
    assert(addCollabRes.data.userId === userBId, 'Collaborator response must reference User B');
    assert(addCollabRes.data.role === 'COLLABORATOR', 'Role must be COLLABORATOR');
    console.log('✓ User A invited User B as COLLABORATOR');

    // User B lists projects now -> Project MUST be visible!
    const listBAfterRes = await makeRequest('GET', '/api/projects', undefined, tokenB);
    assert(listBAfterRes.status === 200, `List B after invite failed: ${listBAfterRes.status}`);
    const bNowSeesProject = listBAfterRes.data.some((p: any) => p.id === createdProjectId);
    assert(bNowSeesProject, 'User B must see project after being added as collaborator');
    console.log('✓ User B now sees project in GET /api/projects');

    // User B gets project by ID
    const getBProjAfterRes = await makeRequest('GET', `/api/projects/${createdProjectId}`, undefined, tokenB);
    assert(getBProjAfterRes.status === 200, `User B should have access to project: ${getBProjAfterRes.status}`);
    console.log('✓ User B successfully accesses project details');

    // User B lists collaborators
    const collabsRes = await makeRequest(
      'GET',
      `/api/projects/${createdProjectId}/collaborators`,
      undefined,
      tokenB
    );
    assert(collabsRes.status === 200, `List collaborators failed: ${collabsRes.status}`);
    assert(collabsRes.data.length >= 2, 'Must have at least 2 members (Owner + Collaborator)');
    const hasAlice = collabsRes.data.some((c: any) => c.userId === userAId && c.isOwner);
    const hasBob = collabsRes.data.some((c: any) => c.userId === userBId && !c.isOwner);
    assert(hasAlice && hasBob, 'Collaborators list must contain Alice (owner) and Bob (collaborator)');
    console.log('✓ Collaborator list endpoint returns both owner and collaborator');

    // ------------------------------------------------------------------------
    // SCENARIO 4: Task Assignment to User B
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Task Assignment & Assignee Payload ---');

    // Create a stage on the project
    const stageRes = await makeRequest(
      'POST',
      `/api/projects/${createdProjectId}/stages`,
      { title: 'In Progress Stage', order: 0 },
      tokenA
    );
    assert(stageRes.status === 201, `Stage creation failed: ${stageRes.status}`);
    createdStageId = stageRes.data.id;
    console.log(`✓ Stage created: ${createdStageId}`);

    // Create task assigned to User B
    const dueDateStr = new Date(Date.now() + 86400000).toISOString();
    const taskRes = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: 'Implement Multi-User Isolation Tests',
        description: 'Verify all 6 scenarios',
        stageId: createdStageId,
        assigneeId: userBId,
        isSprintActive: true,
        dueDate: dueDateStr,
      },
      tokenA
    );
    assert(taskRes.status === 201, `Task creation failed: ${taskRes.status} - ${JSON.stringify(taskRes.data)}`);
    createdTaskId = taskRes.data.id;
    assert(taskRes.data.assigneeId === userBId, 'Task assigneeId must match User B');
    assert(Boolean(taskRes.data.assignee), 'Task must include assignee object');
    assert(taskRes.data.assignee.id === userBId, 'Assignee ID must match');
    assert(taskRes.data.assignee.email === emailB, 'Assignee email must match');
    assert(taskRes.data.assignee.name === 'Bob Builder', 'Assignee name must match');
    console.log('✓ Task created and assigned to User B with full assignee metadata');

    // User B updates task status
    const updateTaskRes = await makeRequest(
      'PATCH',
      `/api/tasks/${createdTaskId}`,
      { status: 'IN_PROGRESS' },
      tokenB
    );
    assert(updateTaskRes.status === 200, `Task update failed: ${updateTaskRes.status}`);
    assert(updateTaskRes.data.status === 'IN_PROGRESS', 'Task status must be IN_PROGRESS');
    assert(updateTaskRes.data.assigneeId === userBId, 'Assignee must be preserved across updates');
    console.log('✓ User B successfully updated task status');

    // Calendar events query with User B token
    const calRes = await makeRequest(
      'GET',
      `/api/calendar/events?startDate=${fromIso}&endDate=${toIso}`,
      undefined,
      tokenB
    );
    assert(calRes.status === 200, `Calendar events failed: ${calRes.status}`);
    const taskInCalendar = calRes.data.some((e: any) => e.sourceId === createdTaskId);
    assert(taskInCalendar, 'Assigned task must appear in User B calendar events');
    console.log('✓ User B calendar events includes assigned project task');

    // ------------------------------------------------------------------------
    // SCENARIO 5: Collaborator Removal & Safe Task Unassignment Cleanup
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Collaborator Removal & Automatic Task Unassignment ---');

    // User A removes User B from project
    const removeCollabRes = await makeRequest(
      'DELETE',
      `/api/projects/${createdProjectId}/collaborators/${userBId}`,
      undefined,
      tokenA
    );
    assert(removeCollabRes.status === 200, `Remove collaborator failed: ${removeCollabRes.status}`);
    console.log('✓ User A successfully removed User B from project');

    // User B lists projects -> project should NOT be accessible anymore
    const listBAfterRemoval = await makeRequest('GET', '/api/projects', undefined, tokenB);
    assert(listBAfterRemoval.status === 200, `List B failed: ${listBAfterRemoval.status}`);
    const bStillSeesProject = listBAfterRemoval.data.some((p: any) => p.id === createdProjectId);
    assert(!bStillSeesProject, 'User B must NOT see project after collaborator removal');
    console.log('✓ User B project access successfully revoked');

    // User B attempts to access project details -> 404
    const getBRemovedProj = await makeRequest('GET', `/api/projects/${createdProjectId}`, undefined, tokenB);
    assert(getBRemovedProj.status === 404, `User B must receive 404 on removed project`);
    console.log('✓ Direct project view by revoked user returns 404');

    // Check Task: Task must still exist, but assigneeId must now be null (safe unassignment cleanup)
    const taskAfterRemoval = await makeRequest('GET', `/api/tasks/${createdTaskId}`, undefined, tokenA);
    assert(taskAfterRemoval.status === 200, `Task fetch failed: ${taskAfterRemoval.status}`);
    assert(taskAfterRemoval.data.assigneeId === null, 'Task assigneeId must be set to null after removal');
    assert(taskAfterRemoval.data.assignee === null, 'Task assignee relation must be null');
    console.log('✓ Safe task unassignment verified: task preserved, assignee set to null');

    // ------------------------------------------------------------------------
    // SCENARIO 6: Legacy Projects Claimed by Admin with Zero Data Loss
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Legacy Projects Backfill & Zero Data Loss ---');

    // Run backfill routine
    const adminUser = await ensureDefaultOwnerAndBackfill();
    assert(Boolean(adminUser), 'Default admin user must exist');
    assert(adminUser.email === 'admin@brainboard.local', 'Admin email must be admin@brainboard.local');
    console.log(`✓ Default admin user verified: ${adminUser.id} (${adminUser.email})`);

    // Verify all projects in database
    const allProjects = await prisma.project.findMany({
      include: {
        stages: { include: { tasks: true } },
        collaborators: true,
      },
    });

    console.log(`✓ Total projects in database: ${allProjects.length}`);
    const legacyTitles = ['NextStep', 'Sistema Visualizador IEC61850', 'Faculdade'];

    for (const title of legacyTitles) {
      const proj = allProjects.find((p) => p.title === title);
      assert(Boolean(proj), `Legacy project "${title}" must exist in database`);
      assert(proj!.ownerId === adminUser.id, `Legacy project "${title}" must be owned by admin (${adminUser.id})`);
      const hasAdminOwnerMember = proj!.collaborators.some(
        (c) => c.userId === adminUser.id && c.role === 'OWNER'
      );
      assert(hasAdminOwnerMember, `Legacy project "${title}" must have admin ProjectMember OWNER record`);
      console.log(`  ✓ Legacy project "${title}" intact (stages: ${proj!.stages.length}, tasks: ${proj!.stages.reduce((acc, s) => acc + s.tasks.length, 0)})`);
    }

    const totalTasks = await prisma.task.count();
    assert(totalTasks >= 30, `Total tasks in DB must be >= 30, found ${totalTasks}`);
    console.log(`✓ Zero data loss verified: ${totalTasks} tasks preserved intact in database`);

    console.log('\n================================================================');
    console.log('   🎉 ALL 6 MULTI-USER ISOLATION & BACKFILL SCENARIOS PASSED!');
    console.log('================================================================\n');
  } finally {
    // Cleanup test artifacts
    console.log('[Cleanup] Cleaning up ephemeral test records...');
    try {
      if (createdProjectId) {
        await prisma.project.deleteMany({ where: { id: createdProjectId } });
      }
      if (userAId) {
        await prisma.user.deleteMany({ where: { id: userAId } });
      }
      if (userBId) {
        await prisma.user.deleteMany({ where: { id: userBId } });
      }
      console.log('[Cleanup] Done.');
    } catch (cleanupErr) {
      console.warn('[Cleanup] Warning during cleanup:', cleanupErr);
    }
  }
}

runTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
    process.exit(1);
  });
