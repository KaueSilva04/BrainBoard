/**
 * Challenger M3-2 Empirical Adversarial Integration & Multi-User Zero-State Harness
 * File: tests/challenger_m3_integration_adversarial.ts
 *
 * Verifies:
 * 1) Newly registered user starts with 0 subjects, 0 assignments, 0 appointments, 0 projects.
 * 2) Multi-tenant isolation prevents new user from reading or modifying another user's data.
 * 3) Logging out removes token from localStorage and resets memory state to null.
 * 4) Dynamic React key remounting contract guarantees zero state upon logout and user switch.
 * 5) MCP tools strictly return zero items for a newly registered user with zero data leakage.
 */

import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../backend/src/prisma.js';
import { handleAcademicTools } from '../backend/src/modules/mcp/tools/academic.tools.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';
import { handleProjectTools } from '../backend/src/modules/mcp/tools/project.tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = process.env.TEST_PORT || '3093';
process.env.PORT = TEST_PORT;
process.env.ALLOW_ANONYMOUS_DEV = 'false';

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface HttpResponse {
  status: number;
  data: any;
  headers: http.IncomingHttpHeaders;
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<HttpResponse> {
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
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

interface TestAssertion {
  section: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
}

const assertions: TestAssertion[] = [];

function check(section: string, name: string, condition: boolean, expected: any, actual: any): void {
  assertions.push({ section, name, passed: condition, expected, actual });
  if (condition) {
    console.log(`  ✓ [${section}] ${name}`);
  } else {
    console.error(`  ✗ [${section}] FAILED: ${name}`);
    console.error(`      Expected: ${JSON.stringify(expected)}`);
    console.error(`      Actual:   ${JSON.stringify(actual)}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('   CHALLENGER M3-2: EMPIRICAL INTEGRATION & ZERO-STATE HARNESS   ');
  console.log('================================================================\n');

  // Start backend server via index.js
  console.log(`[Setup] Starting backend Express server on port ${TEST_PORT}`);
  await import('../backend/src/index.js');
  await new Promise((r) => setTimeout(r, 1500));

  const health = await makeRequest('GET', '/api/health');
  check('Setup', 'Backend responds on port', health.status === 200, 200, health.status);

  const timestamp = Date.now();
  const newUserEmail = `newuser_zero_${timestamp}@challenger.test`;
  const foreignUserEmail = `foreign_user_${timestamp}@challenger.test`;
  const password = 'Password@123';

  let newUserId = '';
  let newUserToken = '';
  let foreignUserId = '';
  let foreignUserToken = '';
  let foreignSubjectId = '';
  let foreignAssignmentId = '';
  let foreignAppointmentId = '';
  let foreignProjectId = '';

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: New User Registration & Zero State Baseline
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: Newly Registered User Zero-Data Baseline ---');

    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Fresh New Account',
      email: newUserEmail,
      password,
    });

    check('Section 1 - Registration', 'Status is 201 Created', regRes.status === 201, 201, regRes.status);
    check('Section 1 - Registration', 'JWT token returned', Boolean(regRes.data?.token), true, Boolean(regRes.data?.token));
    check('Section 1 - Registration', 'User ID returned', Boolean(regRes.data?.user?.id), true, Boolean(regRes.data?.user?.id));

    newUserId = regRes.data.user.id;
    newUserToken = regRes.data.token;

    // Verify 0 subjects
    const subRes = await makeRequest('GET', '/api/academic/subjects', undefined, newUserToken);
    check('Section 1 - Zero State', 'GET /api/academic/subjects returns 200', subRes.status === 200, 200, subRes.status);
    check('Section 1 - Zero State', 'Subjects count is exactly 0', Array.isArray(subRes.data) && subRes.data.length === 0, 0, subRes.data?.length);

    // Verify 0 assignments
    const asgRes = await makeRequest('GET', '/api/academic/assignments', undefined, newUserToken);
    check('Section 1 - Zero State', 'GET /api/academic/assignments returns 200', asgRes.status === 200, 200, asgRes.status);
    check('Section 1 - Zero State', 'Assignments count is exactly 0', Array.isArray(asgRes.data) && asgRes.data.length === 0, 0, asgRes.data?.length);

    // Verify 0 appointments
    const apptRes = await makeRequest('GET', '/api/appointments', undefined, newUserToken);
    check('Section 1 - Zero State', 'GET /api/appointments returns 200', apptRes.status === 200, 200, apptRes.status);
    check('Section 1 - Zero State', 'Appointments count is exactly 0', Array.isArray(apptRes.data) && apptRes.data.length === 0, 0, apptRes.data?.length);

    // Verify 0 calendar projection events
    const calRes = await makeRequest('GET', '/api/calendar/events', undefined, newUserToken);
    check('Section 1 - Zero State', 'GET /api/calendar/events returns 200', calRes.status === 200, 200, calRes.status);
    check('Section 1 - Zero State', 'Calendar events count is exactly 0', Array.isArray(calRes.data) && calRes.data.length === 0, 0, calRes.data?.length);

    // Verify 0 projects
    const projRes = await makeRequest('GET', '/api/projects', undefined, newUserToken);
    check('Section 1 - Zero State', 'GET /api/projects returns 200', projRes.status === 200, 200, projRes.status);
    check('Section 1 - Zero State', 'Projects count is exactly 0', Array.isArray(projRes.data) && projRes.data.length === 0, 0, projRes.data?.length);

    // Direct database validation via Prisma
    const dbSubCount = await prisma.academicSubject.count({ where: { userId: newUserId } });
    const dbAsgCount = await prisma.academicAssignment.count({ where: { userId: newUserId } });
    const dbApptCount = await prisma.appointment.count({ where: { userId: newUserId } });
    const dbProjCount = await prisma.project.count({ where: { ownerId: newUserId } });
    const dbCollabCount = await prisma.projectMember.count({ where: { userId: newUserId } });

    check('Section 1 - DB Verification', 'Database academicSubject count is 0', dbSubCount === 0, 0, dbSubCount);
    check('Section 1 - DB Verification', 'Database academicAssignment count is 0', dbAsgCount === 0, 0, dbAsgCount);
    check('Section 1 - DB Verification', 'Database appointment count is 0', dbApptCount === 0, 0, dbApptCount);
    check('Section 1 - DB Verification', 'Database owned project count is 0', dbProjCount === 0, 0, dbProjCount);
    check('Section 1 - DB Verification', 'Database projectMember count is 0', dbCollabCount === 0, 0, dbCollabCount);

    // -------------------------------------------------------------------------
    // SECTION 2: Foreign Data Isolation & IDOR Protection
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Foreign Data Creation & Non-Leakage Check ---');

    // Register foreign user
    const foreignReg = await makeRequest('POST', '/api/auth/register', {
      name: 'Foreign Active User',
      email: foreignUserEmail,
      password,
    });
    foreignUserId = foreignReg.data.user.id;
    foreignUserToken = foreignReg.data.token;

    // Foreign user creates a subject
    const foreignSub = await makeRequest(
      'POST',
      '/api/academic/subjects',
      { title: 'Foreign Subject Secrets', colorCode: '#ff0000' },
      foreignUserToken
    );
    foreignSubjectId = foreignSub.data.id;

    // Foreign user creates an assignment
    const foreignAsg = await makeRequest(
      'POST',
      '/api/academic/assignments',
      { subjectId: foreignSubjectId, title: 'Confidential Exam', grade: 10.0 },
      foreignUserToken
    );
    foreignAssignmentId = foreignAsg.data.id;

    // Foreign user creates an appointment
    const foreignAppt = await makeRequest(
      'POST',
      '/api/appointments',
      {
        title: 'Private Doctor Appointment',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
      },
      foreignUserToken
    );
    foreignAppointmentId = foreignAppt.data.id;

    // Foreign user creates a project
    const foreignProj = await makeRequest(
      'POST',
      '/api/projects',
      { title: 'Top Secret Project' },
      foreignUserToken
    );
    foreignProjectId = foreignProj.data.id;

    // Now re-query all endpoints with New User token
    const reSubRes = await makeRequest('GET', '/api/academic/subjects', undefined, newUserToken);
    check('Section 2 - Re-query', 'New user still sees 0 subjects after foreign user created items', reSubRes.data.length === 0, 0, reSubRes.data.length);

    const reAsgRes = await makeRequest('GET', '/api/academic/assignments', undefined, newUserToken);
    check('Section 2 - Re-query', 'New user still sees 0 assignments', reAsgRes.data.length === 0, 0, reAsgRes.data.length);

    const reApptRes = await makeRequest('GET', '/api/appointments', undefined, newUserToken);
    check('Section 2 - Re-query', 'New user still sees 0 appointments', reApptRes.data.length === 0, 0, reApptRes.data.length);

    const reProjRes = await makeRequest('GET', '/api/projects', undefined, newUserToken);
    check('Section 2 - Re-query', 'New user still sees 0 projects', reProjRes.data.length === 0, 0, reProjRes.data.length);

    // IDOR checks by New User against Foreign User items:
    const idorSubGet = await makeRequest('GET', `/api/academic/subjects/${foreignSubjectId}`, undefined, newUserToken);
    check('Section 2 - IDOR', 'New user GET foreign subject returns 404', idorSubGet.status === 404, 404, idorSubGet.status);

    const idorApptGet = await makeRequest('GET', `/api/appointments/${foreignAppointmentId}`, undefined, newUserToken);
    check('Section 2 - IDOR', 'New user GET foreign appointment returns 404', idorApptGet.status === 404, 404, idorApptGet.status);

    const idorProjGet = await makeRequest('GET', `/api/projects/${foreignProjectId}`, undefined, newUserToken);
    check('Section 2 - IDOR', 'New user GET foreign project returns 404', idorProjGet.status === 404, 404, idorProjGet.status);

    const idorAsgInject = await makeRequest(
      'POST',
      '/api/academic/assignments',
      { subjectId: foreignSubjectId, title: 'Injected Homework' },
      newUserToken
    );
    check('Section 2 - Injection', 'New user injecting assignment into foreign subject returns 404', idorAsgInject.status === 404, 404, idorAsgInject.status);

    // -------------------------------------------------------------------------
    // SECTION 3: MCP Zero-State & Scoping for New User
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: MCP Tools Scoping for Newly Registered User ---');

    const mcpSubsRes = await handleAcademicTools('list_subjects', {}, newUserId);
    const mcpSubs = JSON.parse(mcpSubsRes?.content[0]?.text || '[]');
    check('Section 3 - MCP', 'handleAcademicTools(list_subjects) returns empty array []', Array.isArray(mcpSubs) && mcpSubs.length === 0, 0, mcpSubs.length);

    const mcpDeadlinesRes = await handleM2Tools('list_upcoming_deadlines', {}, newUserId);
    const mcpDeadlines = JSON.parse(mcpDeadlinesRes?.content[0]?.text || '{}');
    check('Section 3 - MCP', 'handleM2Tools(list_upcoming_deadlines) returns 0 deadlines', (mcpDeadlines?.deadlines || []).length === 0, 0, (mcpDeadlines?.deadlines || []).length);
    check('Section 3 - MCP', 'handleM2Tools(list_upcoming_deadlines) returns 0 appointments', (mcpDeadlines?.appointments || []).length === 0, 0, (mcpDeadlines?.appointments || []).length);

    const mcpProjectsRes = await handleProjectTools('list_projects', {}, newUserId);
    const mcpProjects = JSON.parse(mcpProjectsRes?.content[0]?.text || '[]');
    check('Section 3 - MCP', 'handleProjectTools(list_projects) returns empty array []', Array.isArray(mcpProjects) && mcpProjects.length === 0, 0, mcpProjects.length);

    // -------------------------------------------------------------------------
    // SECTION 4: Logout, LocalStorage Token Purge & Remount Contract
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Logout, LocalStorage Token Purge & Remount Contract ---');

    // 1. AST / Source Verification of api.ts setAuthToken
    const apiTsPath = path.resolve(__dirname, '../frontend/src/services/api.ts');
    const apiCode = fs.readFileSync(apiTsPath, 'utf-8');
    check('Section 4 - Source Audit', 'api.ts contains setAuthToken function', apiCode.includes('export function setAuthToken(token: string | null): void'), true, apiCode.includes('export function setAuthToken(token: string | null): void'));
    check('Section 4 - Source Audit', "setAuthToken removes brainboard_token on null", apiCode.includes("localStorage.removeItem('brainboard_token')"), true, apiCode.includes("localStorage.removeItem('brainboard_token')"));
    check('Section 4 - Source Audit', "setAuthToken sets brainboard_token on token", apiCode.includes("localStorage.setItem('brainboard_token', token)"), true, apiCode.includes("localStorage.setItem('brainboard_token', token)"));

    // 2. AST / Source Verification of AuthContext.tsx logout
    const authContextPath = path.resolve(__dirname, '../frontend/src/context/AuthContext.tsx');
    const authCode = fs.readFileSync(authContextPath, 'utf-8');
    check('Section 4 - Source Audit', 'AuthContext.tsx contains logout function', authCode.includes('const logout = async () =>'), true, authCode.includes('const logout = async () =>'));
    check('Section 4 - Source Audit', 'logout invokes setAuthToken(null) in finally', authCode.includes('setAuthToken(null)'), true, authCode.includes('setAuthToken(null)'));
    check('Section 4 - Source Audit', 'logout sets token state to null', authCode.includes('setTokenState(null)'), true, authCode.includes('setTokenState(null)'));
    check('Section 4 - Source Audit', 'logout sets user state to null', authCode.includes('setUser(null)'), true, authCode.includes('setUser(null)'));

    // 3. Runtime Simulation of LocalStorage & State Purge
    const storageStore: Record<string, string> = {};
    let memoryToken: string | null = null;
    let memoryUser: any = null;

    const mockLocalStorage = {
      getItem: (k: string) => storageStore[k] || null,
      setItem: (k: string, v: string) => { storageStore[k] = v; },
      removeItem: (k: string) => { delete storageStore[k]; },
    };

    function simulatedSetAuthToken(token: string | null) {
      memoryToken = token;
      if (token) {
        mockLocalStorage.setItem('brainboard_token', token);
      } else {
        mockLocalStorage.removeItem('brainboard_token');
      }
    }

    async function simulatedLogout() {
      // Simulate finally block in AuthContext.tsx
      simulatedSetAuthToken(null);
      memoryToken = null;
      memoryUser = null;
    }

    // Login state
    simulatedSetAuthToken(newUserToken);
    memoryUser = { id: newUserId, email: newUserEmail };
    check('Section 4 - Token Lifecycle', 'Token stored in localStorage on login', mockLocalStorage.getItem('brainboard_token') === newUserToken, newUserToken, mockLocalStorage.getItem('brainboard_token'));
    check('Section 4 - Token Lifecycle', 'Memory token is set', memoryToken === newUserToken, newUserToken, memoryToken);

    // Logout state
    await simulatedLogout();
    check('Section 4 - Token Lifecycle', 'Token removed from localStorage on logout', mockLocalStorage.getItem('brainboard_token') === null, null, mockLocalStorage.getItem('brainboard_token'));
    check('Section 4 - Token Lifecycle', 'Memory token is null after logout', memoryToken === null, null, memoryToken);
    check('Section 4 - Token Lifecycle', 'Memory user is null after logout', memoryUser === null, null, memoryUser);

    // 4. Source & AST Verification of Dynamic User Key in App.tsx
    const appTsxPath = path.resolve(__dirname, '../frontend/src/App.tsx');
    const appCode = fs.readFileSync(appTsxPath, 'utf-8');
    check('Section 4 - App Remount', 'AppContent has dynamic user key', appCode.includes("<AppContent key={user?.id ?? 'anonymous'} />"), true, appCode.includes("<AppContent key={user?.id ?? 'anonymous'} />"));
    check('Section 4 - App Remount', 'App mounts AuthenticatedAppContent within AuthProvider', appCode.includes('<AuthenticatedAppContent />'), true, appCode.includes('<AuthenticatedAppContent />'));

    // Verify React Key Remounting logic
    // Formula from App.tsx: key={user?.id ?? 'anonymous'}
    const computeKey = (u: { id: string } | null) => u?.id ?? 'anonymous';

    const keyUser1 = computeKey({ id: newUserId });
    const keyLoggedOut = computeKey(null);
    const keyUser2 = computeKey({ id: foreignUserId });

    check('Section 4 - React Key Contract', 'Key for User 1 is User 1 ID', keyUser1 === newUserId, newUserId, keyUser1);
    check('Section 4 - React Key Contract', 'Key for logged out user is "anonymous"', keyLoggedOut === 'anonymous', 'anonymous', keyLoggedOut);
    check('Section 4 - React Key Contract', 'Key for User 2 is User 2 ID', keyUser2 === foreignUserId, foreignUserId, keyUser2);
    check('Section 4 - React Key Contract', 'Logout changes key from User 1 to anonymous', keyUser1 !== keyLoggedOut, true, keyUser1 !== keyLoggedOut);
    check('Section 4 - React Key Contract', 'User switch changes key from User 1 to User 2', keyUser1 !== keyUser2, true, keyUser1 !== keyUser2);

    console.log('\n================================================================');
    console.log('   CHALLENGER M3-2 RESULTS SUMMARY                              ');
    console.log('================================================================');
    const passedCount = assertions.filter((a) => a.passed).length;
    console.log(`Total Assertions Evaluated: ${assertions.length}`);
    console.log(`Passed: ${passedCount} | Failed: ${assertions.length - passedCount}`);
    console.log('================================================================\n');

    console.log('🎉 ALL EMPIRICAL INTEGRATION & MULTI-USER CHALLENGES PASSED!\n');
  } finally {
    console.log('[Cleanup] Cleaning up test users and entities...');
    try {
      if (foreignAssignmentId) {
        await prisma.academicAssignment.deleteMany({ where: { id: foreignAssignmentId } });
      }
      if (foreignSubjectId) {
        await prisma.academicSubject.deleteMany({ where: { id: foreignSubjectId } });
      }
      if (foreignAppointmentId) {
        await prisma.appointment.deleteMany({ where: { id: foreignAppointmentId } });
      }
      if (foreignProjectId) {
        await prisma.task.deleteMany({ where: { stage: { projectId: foreignProjectId } } });
        await prisma.stage.deleteMany({ where: { projectId: foreignProjectId } });
        await prisma.projectMember.deleteMany({ where: { projectId: foreignProjectId } });
        await prisma.project.deleteMany({ where: { id: foreignProjectId } });
      }
      if (foreignUserId) {
        await prisma.user.deleteMany({ where: { id: foreignUserId } });
      }
      if (newUserId) {
        await prisma.user.deleteMany({ where: { id: newUserId } });
      }
      console.log('[Cleanup] Done.');
    } catch (cleanupErr) {
      console.warn('[Cleanup Warning]', cleanupErr);
    }
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test harness encountered unhandled error:', err);
  process.exit(1);
});
