/**
 * BrainBoard Milestone 2 Empirical Adversarial Challenger Test Suite
 * File: tests/adversarial_challenger_m2.ts
 *
 * Authored by: Challenger 1 (Milestone 2)
 * Purpose: Independently and empirically verify multi-tenant HTTP isolation,
 * IDOR prevention, cross-tenant boundary integrity, and MCP scoping on live Express routes.
 */

import http from 'http';
import jwt from '../backend/node_modules/jsonwebtoken/index.js';
import { prisma } from '../backend/src/prisma.js';
import { handleAcademicTools } from '../backend/src/modules/mcp/tools/academic.tools.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';

const TEST_PORT = process.env.TEST_PORT || '3095';
process.env.PORT = TEST_PORT;
// Enforce production mode: reject unauthenticated anonymous dev access
process.env.ALLOW_ANONYMOUS_DEV = 'false';

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'brainboard-jwt-secret-key-2026-production';

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
    if (postData) req.write(postData);
    req.end();
  });
}

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, msg: string) {
  totalAssertions++;
  if (!condition) {
    failedAssertions++;
    console.error(`  ❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
  passedAssertions++;
}

function assertStatus(res: HttpResponse, expected: number | number[], context: string) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const passed = allowed.includes(res.status);
  assert(
    passed,
    `${context} - Expected HTTP ${allowed.join(' or ')}, received ${res.status}. Response body: ${JSON.stringify(res.data)}`
  );
}

interface TestSection {
  name: string;
  passed: boolean;
  error?: string;
  assertions: number;
}

async function runAdversarialVerification() {
  console.log('================================================================');
  console.log('   CHALLENGER 1: Milestone 2 Empirical Adversarial Verification  ');
  console.log('================================================================\n');

  console.log('[Setup] Starting live backend Express server on port', TEST_PORT);
  const appModule = await import('../backend/src/index.js');
  const app = appModule.default;

  // Settle time for server and backfill
  await new Promise((r) => setTimeout(r, 1500));

  const health = await makeRequest('GET', '/api/health');
  assertStatus(health, 200, 'Server health check');
  console.log(`✓ Live Express server operational on http://127.0.0.1:${TEST_PORT}\n`);

  const timestamp = Date.now();
  const emailA = `alice_adversary_${timestamp}@challenger.local`;
  const emailB = `bob_adversary_${timestamp}@challenger.local`;
  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';

  const createdUserIds: string[] = [];
  const createdSubjectIds: string[] = [];
  const createdAssignmentIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  let aliceSubjectId = '';
  let aliceAssignmentId = '';
  let aliceAppointmentId = '';

  const sections: TestSection[] = [];

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Unauthenticated Route Rejection (401 Unauthorized)
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: Unauthenticated Route Rejection (401 Unauthorized) ---');
    const s1Start = totalAssertions;
    try {
      // 1.1 Academic Subjects
      const unauthSubjectsGet = await makeRequest('GET', '/api/academic/subjects');
      assertStatus(unauthSubjectsGet, 401, 'Unauthenticated GET /api/academic/subjects');

      const unauthSubjectsPost = await makeRequest('POST', '/api/academic/subjects', { title: 'Ghost Subject' });
      assertStatus(unauthSubjectsPost, 401, 'Unauthenticated POST /api/academic/subjects');

      // 1.2 Academic Assignments
      const unauthAssignmentsGet = await makeRequest('GET', '/api/academic/assignments');
      assertStatus(unauthAssignmentsGet, 401, 'Unauthenticated GET /api/academic/assignments');

      const unauthAssignmentsPost = await makeRequest('POST', '/api/academic/assignments', {
        title: 'Ghost Assignment',
        subjectId: '00000000-0000-0000-0000-000000000000',
        type: 'HOMEWORK',
      });
      assertStatus(unauthAssignmentsPost, 401, 'Unauthenticated POST /api/academic/assignments');

      // 1.3 Appointments
      const unauthAppointmentsGet = await makeRequest('GET', '/api/appointments');
      assertStatus(unauthAppointmentsGet, 401, 'Unauthenticated GET /api/appointments');

      const unauthAppointmentsPost = await makeRequest('POST', '/api/appointments', {
        title: 'Ghost Appointment',
        startTime: '2026-11-01T10:00:00Z',
        endTime: '2026-11-01T11:00:00Z',
      });
      assertStatus(unauthAppointmentsPost, 401, 'Unauthenticated POST /api/appointments');

      // 1.4 Calendar Events
      const unauthCalendarEventsGet = await makeRequest('GET', '/api/calendar/events');
      assertStatus(unauthCalendarEventsGet, 401, 'Unauthenticated GET /api/calendar/events');

      // 1.5 Legacy paths
      const unauthLegacySubjects = await makeRequest('GET', '/subjects');
      assertStatus(unauthLegacySubjects, 401, 'Unauthenticated GET /subjects');

      const unauthLegacyAssignments = await makeRequest('GET', '/assignments');
      assertStatus(unauthLegacyAssignments, 401, 'Unauthenticated GET /assignments');

      // 1.6 Malformed and Forged Tokens
      const forgedToken = jwt.sign({ userId: 'fake-user-id' }, 'wrong-secret-key-12345');
      const forgedRes = await makeRequest('GET', '/api/academic/subjects', undefined, forgedToken);
      assertStatus(forgedRes, 401, 'GET with forged JWT signature');

      const garbageTokenRes = await makeRequest('GET', '/api/academic/subjects', undefined, 'garbage.not.jwt');
      assertStatus(garbageTokenRes, 401, 'GET with garbage Bearer token');

      const expiredToken = jwt.sign(
        { userId: 'fake-user-id' },
        JWT_SECRET,
        { expiresIn: -10 }
      );
      const expiredRes = await makeRequest('GET', '/api/appointments', undefined, expiredToken);
      assertStatus(expiredRes, 401, 'GET with expired JWT token');

      sections.push({ name: 'Unauthenticated & Malformed Token Rejection', passed: true, assertions: totalAssertions - s1Start });
      console.log('✓ Section 1 PASSED: Strict 401 Unauthorized enforcement verified across all target endpoints');
    } catch (err: any) {
      sections.push({ name: 'Unauthenticated & Malformed Token Rejection', passed: false, error: err.message, assertions: totalAssertions - s1Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 2: User Registration & Authentication (Alice and Bob)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: User Registration & Authentication ---');
    const s2Start = totalAssertions;
    try {
      // Register Alice
      const regA = await makeRequest('POST', '/api/auth/register', {
        name: 'Alice Challenger',
        email: emailA,
        password: 'PasswordAlice2026!',
      });
      assertStatus(regA, 201, 'Alice registration');
      assert(Boolean(regA.data?.token), 'Alice registration must return JWT');
      tokenA = regA.data.token;
      userAId = regA.data.user.id;
      createdUserIds.push(userAId);

      // Register Bob
      const regB = await makeRequest('POST', '/api/auth/register', {
        name: 'Bob Challenger',
        email: emailB,
        password: 'PasswordBob2026!',
      });
      assertStatus(regB, 201, 'Bob registration');
      assert(Boolean(regB.data?.token), 'Bob registration must return JWT');
      tokenB = regB.data.token;
      userBId = regB.data.user.id;
      createdUserIds.push(userBId);

      assert(userAId !== userBId, 'User A and User B must have distinct tenant IDs');

      // Login Alice
      const logA = await makeRequest('POST', '/api/auth/login', {
        email: emailA,
        password: 'PasswordAlice2026!',
      });
      assertStatus(logA, 200, 'Alice login');
      assert(logA.data.user.id === userAId, 'Alice login must return userAId');

      // Login Bob
      const logB = await makeRequest('POST', '/api/auth/login', {
        email: emailB,
        password: 'PasswordBob2026!',
      });
      assertStatus(logB, 200, 'Bob login');
      assert(logB.data.user.id === userBId, 'Bob login must return userBId');

      sections.push({ name: 'User Registration & Authentication', passed: true, assertions: totalAssertions - s2Start });
      console.log(`✓ Section 2 PASSED: Registered Alice (${userAId}) and Bob (${userBId}) with active JWTs`);
    } catch (err: any) {
      sections.push({ name: 'User Registration & Authentication', passed: false, error: err.message, assertions: totalAssertions - s2Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 3: User A Creates Subject, Assignment, and Appointment
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: User A Data Creation & Database Ownership Binding ---');
    const s3Start = totalAssertions;
    try {
      // Alice creates Subject
      const subRes = await makeRequest(
        'POST',
        '/api/academic/subjects',
        {
          title: `Alice Distributed Systems ${timestamp}`,
          description: 'Fault tolerance & consensus algorithms',
          professor: 'Dr. Lamport',
          colorCode: '#6366f1',
        },
        tokenA
      );
      assertStatus(subRes, 201, 'Alice creates subject');
      aliceSubjectId = subRes.data.id;
      createdSubjectIds.push(aliceSubjectId);
      assert(Boolean(aliceSubjectId), 'Created subject must have valid ID');

      // Verify DB binding for Subject
      const dbSubject = await prisma.academicSubject.findUnique({ where: { id: aliceSubjectId } });
      assert(dbSubject !== null, 'Subject must exist in database');
      assert(dbSubject?.userId === userAId, `Subject userId must equal userAId (${userAId}), got ${dbSubject?.userId}`);

      // Alice creates Assignment
      const assignRes = await makeRequest(
        'POST',
        '/api/academic/assignments',
        {
          subjectId: aliceSubjectId,
          title: `Raft Consensus Project ${timestamp}`,
          description: 'Implement leader election and log replication',
          type: 'PROJECT',
          grade: 9.85,
          dueDate: '2026-11-15T23:59:00Z',
          status: 'IN_PROGRESS',
        },
        tokenA
      );
      assertStatus(assignRes, 201, 'Alice creates assignment');
      aliceAssignmentId = assignRes.data.id;
      createdAssignmentIds.push(aliceAssignmentId);
      assert(Boolean(aliceAssignmentId), 'Created assignment must have valid ID');

      // Verify DB binding for Assignment
      const dbAssignment = await prisma.academicAssignment.findUnique({ where: { id: aliceAssignmentId } });
      assert(dbAssignment !== null, 'Assignment must exist in database');
      assert(dbAssignment?.userId === userAId, `Assignment userId must equal userAId (${userAId}), got ${dbAssignment?.userId}`);
      assert(dbAssignment?.subjectId === aliceSubjectId, 'Assignment must belong to Alice subject');

      // Alice creates Appointment
      const aptRes = await makeRequest(
        'POST',
        '/api/appointments',
        {
          title: `Thesis Advising Session ${timestamp}`,
          startTime: '2026-11-10T14:00:00Z',
          endTime: '2026-11-10T15:00:00Z',
          description: 'Review formal verification proofs',
          locationOrLink: 'https://meet.jit.si/alice-thesis-advising',
        },
        tokenA
      );
      assertStatus(aptRes, 201, 'Alice creates appointment');
      aliceAppointmentId = aptRes.data.id;
      createdAppointmentIds.push(aliceAppointmentId);
      assert(Boolean(aliceAppointmentId), 'Created appointment must have valid ID');

      // Verify DB binding for Appointment
      const dbAppointment = await prisma.appointment.findUnique({ where: { id: aliceAppointmentId } });
      assert(dbAppointment !== null, 'Appointment must exist in database');
      assert(dbAppointment?.userId === userAId, `Appointment userId must equal userAId (${userAId}), got ${dbAppointment?.userId}`);

      sections.push({ name: 'Data Creation & DB User Binding', passed: true, assertions: totalAssertions - s3Start });
      console.log('✓ Section 3 PASSED: Alice created subject, assignment, and appointment with verified DB ownership');
    } catch (err: any) {
      sections.push({ name: 'Data Creation & DB User Binding', passed: false, error: err.message, assertions: totalAssertions - s3Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 4: User B Cross-Tenant Query Isolation (Zero Leakage)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: User B Cross-Tenant Query Isolation ---');
    const s4Start = totalAssertions;
    try {
      // 4.1 Bob queries subjects
      const bobSubjectsRes = await makeRequest('GET', '/api/academic/subjects', undefined, tokenB);
      assertStatus(bobSubjectsRes, 200, 'Bob queries /api/academic/subjects');
      assert(Array.isArray(bobSubjectsRes.data), 'Bob subjects must return an array');
      const bobSeesAliceSubject = bobSubjectsRes.data.some((s: any) => s.id === aliceSubjectId);
      assert(!bobSeesAliceSubject, 'CRITICAL LEAK: Bob must not see Alice subject in list!');
      assert(bobSubjectsRes.data.length === 0, `Bob must see 0 subjects, saw ${bobSubjectsRes.data.length}`);

      // 4.2 Bob queries assignments
      const bobAssignmentsRes = await makeRequest('GET', '/api/academic/assignments', undefined, tokenB);
      assertStatus(bobAssignmentsRes, 200, 'Bob queries /api/academic/assignments');
      assert(Array.isArray(bobAssignmentsRes.data), 'Bob assignments must return an array');
      const bobSeesAliceAssignment = bobAssignmentsRes.data.some((a: any) => a.id === aliceAssignmentId);
      assert(!bobSeesAliceAssignment, 'CRITICAL LEAK: Bob must not see Alice assignment in list!');
      assert(bobAssignmentsRes.data.length === 0, `Bob must see 0 assignments, saw ${bobAssignmentsRes.data.length}`);

      // 4.3 Bob queries assignments filtering by Alice's subjectId
      const bobFilteredAssignRes = await makeRequest(
        'GET',
        `/api/academic/assignments?subjectId=${aliceSubjectId}`,
        undefined,
        tokenB
      );
      assertStatus(bobFilteredAssignRes, [200, 404], 'Bob queries assignments with Alice subjectId filter');
      if (bobFilteredAssignRes.status === 200) {
        assert(Array.isArray(bobFilteredAssignRes.data), 'Must return array');
        assert(bobFilteredAssignRes.data.length === 0, 'Bob must receive empty array when filtering by Alice subjectId');
      }

      // 4.4 Bob queries appointments
      const bobAppointmentsRes = await makeRequest('GET', '/api/appointments', undefined, tokenB);
      assertStatus(bobAppointmentsRes, 200, 'Bob queries /api/appointments');
      assert(Array.isArray(bobAppointmentsRes.data), 'Bob appointments must return an array');
      const bobSeesAliceAppointment = bobAppointmentsRes.data.some((apt: any) => apt.id === aliceAppointmentId);
      assert(!bobSeesAliceAppointment, 'CRITICAL LEAK: Bob must not see Alice appointment in list!');
      assert(bobAppointmentsRes.data.length === 0, `Bob must see 0 appointments, saw ${bobAppointmentsRes.data.length}`);

      // 4.5 Bob queries calendar events
      const bobCalendarRes = await makeRequest('GET', '/api/calendar/events', undefined, tokenB);
      assertStatus(bobCalendarRes, 200, 'Bob queries /api/calendar/events');
      assert(Array.isArray(bobCalendarRes.data), 'Bob calendar events must return an array');
      const bobSeesAliceCalendarEvents = bobCalendarRes.data.some(
        (e: any) => e.sourceId === aliceAppointmentId || e.sourceId === aliceAssignmentId
      );
      assert(!bobSeesAliceCalendarEvents, 'CRITICAL LEAK: Bob must not see Alice appointment/assignment in calendar projection!');
      assert(bobCalendarRes.data.length === 0, `Bob must see 0 calendar events, saw ${bobCalendarRes.data.length}`);

      sections.push({ name: 'Cross-Tenant Query Isolation', passed: true, assertions: totalAssertions - s4Start });
      console.log('✓ Section 4 PASSED: Zero cross-tenant data leakage across all 5 query endpoints');
    } catch (err: any) {
      sections.push({ name: 'Cross-Tenant Query Isolation', passed: false, error: err.message, assertions: totalAssertions - s4Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 5: Direct Access / IDOR Rejection on Subject
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Direct Access / IDOR Rejection on Subject (GET, PATCH, DELETE) ---');
    const s5Start = totalAssertions;
    try {
      // 5.1 Bob GET Alice Subject
      const idorSubGet = await makeRequest('GET', `/api/academic/subjects/${aliceSubjectId}`, undefined, tokenB);
      assertStatus(idorSubGet, 404, 'Bob direct GET /api/academic/subjects/:aliceSubjectId');

      // 5.2 Bob PATCH Alice Subject
      const idorSubPatch = await makeRequest(
        'PATCH',
        `/api/academic/subjects/${aliceSubjectId}`,
        { title: 'Hacked by Bob 💀' },
        tokenB
      );
      assertStatus(idorSubPatch, 404, 'Bob direct PATCH /api/academic/subjects/:aliceSubjectId');

      // Verify in DB that Alice's subject was NOT modified
      const checkSub = await prisma.academicSubject.findUnique({ where: { id: aliceSubjectId } });
      assert(checkSub?.title.startsWith('Alice Distributed Systems'), 'Integrity breach: Alice subject title was modified!');

      // 5.3 Bob DELETE Alice Subject
      const idorSubDelete = await makeRequest('DELETE', `/api/academic/subjects/${aliceSubjectId}`, undefined, tokenB);
      assertStatus(idorSubDelete, 404, 'Bob direct DELETE /api/academic/subjects/:aliceSubjectId');

      // Verify in DB that Alice's subject still exists
      const checkSubStillExists = await prisma.academicSubject.findUnique({ where: { id: aliceSubjectId } });
      assert(checkSubStillExists !== null, 'Integrity breach: Alice subject was deleted by Bob!');

      sections.push({ name: 'Subject IDOR Protection (404 Not Found)', passed: true, assertions: totalAssertions - s5Start });
      console.log('✓ Section 5 PASSED: Direct GET, PATCH, and DELETE on foreign subject strictly rejected with 404');
    } catch (err: any) {
      sections.push({ name: 'Subject IDOR Protection (404 Not Found)', passed: false, error: err.message, assertions: totalAssertions - s5Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 6: Direct Access / IDOR Rejection on Appointment
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Direct Access / IDOR Rejection on Appointment (GET, PATCH, DELETE) ---');
    const s6Start = totalAssertions;
    try {
      // 6.1 Bob GET Alice Appointment
      const idorAptGet = await makeRequest('GET', `/api/appointments/${aliceAppointmentId}`, undefined, tokenB);
      assertStatus(idorAptGet, 404, 'Bob direct GET /api/appointments/:aliceAppointmentId');

      // 6.2 Bob PATCH Alice Appointment
      const idorAptPatch = await makeRequest(
        'PATCH',
        `/api/appointments/${aliceAppointmentId}`,
        { title: 'Cancelled by Bob 💀', isCompleted: true },
        tokenB
      );
      assertStatus(idorAptPatch, 404, 'Bob direct PATCH /api/appointments/:aliceAppointmentId');

      // Verify in DB that Alice's appointment was NOT modified
      const checkApt = await prisma.appointment.findUnique({ where: { id: aliceAppointmentId } });
      assert(checkApt?.title.startsWith('Thesis Advising Session'), 'Integrity breach: Alice appointment title was modified!');
      assert(checkApt?.isCompleted === false, 'Integrity breach: Alice appointment completion status was tampered with!');

      // 6.3 Bob DELETE Alice Appointment
      const idorAptDelete = await makeRequest('DELETE', `/api/appointments/${aliceAppointmentId}`, undefined, tokenB);
      assertStatus(idorAptDelete, 404, 'Bob direct DELETE /api/appointments/:aliceAppointmentId');

      // Verify in DB that Alice's appointment still exists
      const checkAptStillExists = await prisma.appointment.findUnique({ where: { id: aliceAppointmentId } });
      assert(checkAptStillExists !== null, 'Integrity breach: Alice appointment was deleted by Bob!');

      sections.push({ name: 'Appointment IDOR Protection (404 Not Found)', passed: true, assertions: totalAssertions - s6Start });
      console.log('✓ Section 6 PASSED: Direct GET, PATCH, and DELETE on foreign appointment strictly rejected with 404');
    } catch (err: any) {
      sections.push({ name: 'Appointment IDOR Protection (404 Not Found)', passed: false, error: err.message, assertions: totalAssertions - s6Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 7: Direct Access / IDOR Rejection on Assignment (PATCH, DELETE)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Direct Access / IDOR Rejection on Assignment (PATCH, DELETE) ---');
    const s7Start = totalAssertions;
    try {
      // 7.1 Bob PATCH Alice Assignment (e.g. tampering with grade or status)
      const idorAssignPatch = await makeRequest(
        'PATCH',
        `/api/academic/assignments/${aliceAssignmentId}`,
        { grade: 0.0, status: 'DONE', title: 'Tampered by Bob' },
        tokenB
      );
      assertStatus(idorAssignPatch, 404, 'Bob direct PATCH /api/academic/assignments/:aliceAssignmentId');

      // Verify in DB that Alice's assignment was NOT modified
      const checkAssign = await prisma.academicAssignment.findUnique({ where: { id: aliceAssignmentId } });
      assert(checkAssign?.grade === 9.85, `Integrity breach: Alice grade was tampered with! Expected 9.85, got ${checkAssign?.grade}`);
      assert(checkAssign?.status === 'IN_PROGRESS', 'Integrity breach: Alice assignment status was tampered with!');

      // 7.2 Bob DELETE Alice Assignment
      const idorAssignDelete = await makeRequest('DELETE', `/api/academic/assignments/${aliceAssignmentId}`, undefined, tokenB);
      assertStatus(idorAssignDelete, 404, 'Bob direct DELETE /api/academic/assignments/:aliceAssignmentId');

      // Verify in DB that Alice's assignment still exists
      const checkAssignStillExists = await prisma.academicAssignment.findUnique({ where: { id: aliceAssignmentId } });
      assert(checkAssignStillExists !== null, 'Integrity breach: Alice assignment was deleted by Bob!');

      sections.push({ name: 'Assignment IDOR Protection (404 Not Found)', passed: true, assertions: totalAssertions - s7Start });
      console.log('✓ Section 7 PASSED: Direct PATCH and DELETE on foreign assignment strictly rejected with 404');
    } catch (err: any) {
      sections.push({ name: 'Assignment IDOR Protection (404 Not Found)', passed: false, error: err.message, assertions: totalAssertions - s7Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 8: Cross-Tenant Subject Injection Blocked (404 Not Found)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Cross-Tenant Subject Injection Blocked ---');
    const s8Start = totalAssertions;
    try {
      // Bob attempts to create an assignment referencing Alice's subjectId
      const injectRes = await makeRequest(
        'POST',
        '/api/academic/assignments',
        {
          subjectId: aliceSubjectId,
          title: 'Bob Trojan Assignment In Alice Subject',
          type: 'EXAM',
          grade: 5.0,
        },
        tokenB
      );
      assertStatus(injectRes, 404, 'Bob POST /api/academic/assignments with Alice subjectId');

      // Verify in DB that no foreign assignment was attached to Alice's subject
      const aliceAssignments = await prisma.academicAssignment.findMany({
        where: { subjectId: aliceSubjectId },
      });
      assert(aliceAssignments.length === 1, `Alice subject must have exactly 1 assignment, found ${aliceAssignments.length}`);
      assert(aliceAssignments[0].id === aliceAssignmentId, 'Alice subject must contain only Alice original assignment');

      sections.push({ name: 'Cross-Tenant Subject Injection Rejection', passed: true, assertions: totalAssertions - s8Start });
      console.log('✓ Section 8 PASSED: Cross-tenant foreign key subject injection strictly blocked with 404');
    } catch (err: any) {
      sections.push({ name: 'Cross-Tenant Subject Injection Rejection', passed: false, error: err.message, assertions: totalAssertions - s8Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SECTION 9: Adversarial Edge Cases & Stress Vectors
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 9: Adversarial Edge Cases & Stress Vectors ---');
    const s9Start = totalAssertions;
    try {
      // 9.1 Mass Assignment / Owner Spoofing Attack on Create
      // User B attempts to forge 'userId: userAId' in POST body
      const spoofSubjectRes = await makeRequest(
        'POST',
        '/api/academic/subjects',
        {
          title: `Bob Spoofed Subject ${timestamp}`,
          userId: userAId, // Attempting to assign subject to Alice
        },
        tokenB
      );
      assertStatus(spoofSubjectRes, 201, 'Bob creates subject with spoofed userId');
      const spoofSubjectId = spoofSubjectRes.data.id;
      createdSubjectIds.push(spoofSubjectId);

      const dbSpoofSubject = await prisma.academicSubject.findUnique({ where: { id: spoofSubjectId } });
      assert(dbSpoofSubject?.userId === userBId, `Mass assignment vulnerability: userId was spoofed! Expected ${userBId}, got ${dbSpoofSubject?.userId}`);

      // 9.2 Mass Assignment / Owner Spoofing Attack on Appointment
      const spoofAptRes = await makeRequest(
        'POST',
        '/api/appointments',
        {
          title: `Bob Spoofed Appointment ${timestamp}`,
          startTime: '2026-11-20T10:00:00Z',
          endTime: '2026-11-20T11:00:00Z',
          userId: userAId, // Attempting to inject into Alice
        },
        tokenB
      );
      assertStatus(spoofAptRes, 201, 'Bob creates appointment with spoofed userId');
      const spoofAptId = spoofAptRes.data.id;
      createdAppointmentIds.push(spoofAptId);

      const dbSpoofApt = await prisma.appointment.findUnique({ where: { id: spoofAptId } });
      assert(dbSpoofApt?.userId === userBId, `Mass assignment vulnerability: appointment userId was spoofed! Expected ${userBId}, got ${dbSpoofApt?.userId}`);

      // 9.3 Inverted Date Window on Calendar (Stress resilience)
      const invertedCalRes = await makeRequest(
        'GET',
        '/api/calendar/events?startDate=2026-12-31T00:00:00Z&endDate=2026-01-01T00:00:00Z',
        undefined,
        tokenA
      );
      assertStatus(invertedCalRes, [200, 400], 'Inverted calendar date window');
      if (invertedCalRes.status === 200) {
        assert(Array.isArray(invertedCalRes.data), 'Inverted window returns empty array');
        assert(invertedCalRes.data.length === 0, 'No events should match inverted date window');
      }

      // 9.4 MCP Multi-Tenant Isolation
      // Verify handleAcademicTools with User B context
      const mcpBobSubjects = await handleAcademicTools('list_subjects', {}, userBId);
      assert(mcpBobSubjects !== null, 'handleAcademicTools must return result');
      const mcpSubjectsList = JSON.parse(mcpBobSubjects!.content[0].text);
      assert(Array.isArray(mcpSubjectsList), 'MCP subjects must be array');
      const mcpHasAliceSubject = mcpSubjectsList.some((s: any) => s.id === aliceSubjectId);
      assert(!mcpHasAliceSubject, 'CRITICAL MCP LEAK: Bob MCP session saw Alice subject!');

      // Bob tries to create assignment via MCP with Alice subjectId
      let mcpInjectionFailed = false;
      try {
        await handleAcademicTools(
          'create_assignment',
          {
            subjectId: aliceSubjectId,
            title: 'MCP Injected Assignment',
            type: 'OTHER',
          },
          userBId
        );
      } catch (mcpErr: any) {
        mcpInjectionFailed = true;
      }
      assert(mcpInjectionFailed, 'MCP injection vulnerability: Bob created assignment under Alice subject via MCP!');

      // Bob queries upcoming deadlines via MCP m2.tools
      const mcpBobDeadlines = await handleM2Tools('list_upcoming_deadlines', { days: 30 }, userBId);
      assert(mcpBobDeadlines !== null, 'handleM2Tools must return result');
      const mcpDeadlinesData = JSON.parse(mcpBobDeadlines!.content[0].text);
      const mcpSeesAliceApt = mcpDeadlinesData.appointments.some((a: any) => a.id === aliceAppointmentId);
      assert(!mcpSeesAliceApt, 'CRITICAL MCP LEAK: Bob MCP upcoming deadlines saw Alice appointment!');

      sections.push({ name: 'Adversarial Edge Cases & MCP Scoping', passed: true, assertions: totalAssertions - s9Start });
      console.log('✓ Section 9 PASSED: Mass assignment protection, resilience, and MCP multi-tenant scoping verified');
    } catch (err: any) {
      sections.push({ name: 'Adversarial Edge Cases & MCP Scoping', passed: false, error: err.message, assertions: totalAssertions - s9Start });
      throw err;
    }

    // ------------------------------------------------------------------------
    // SUMMARY REPORT
    // ------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('   CHALLENGER 1 ADVERSARIAL TEST RESULTS SUMMARY                 ');
    console.log('================================================================');
    let allPassed = true;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const badge = s.passed ? '✓ PASS' : '❌ FAIL';
      console.log(`[${badge}] Section ${i + 1}: ${s.name} (${s.assertions} assertions)`);
      if (!s.passed) {
        allPassed = false;
        console.log(`    Error: ${s.error}`);
      }
    }
    console.log('----------------------------------------------------------------');
    console.log(`Total Assertions Evaluated: ${totalAssertions}`);
    console.log(`Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
    console.log('================================================================\n');

    if (!allPassed) {
      throw new Error('One or more adversarial verification sections failed.');
    }

    console.log('🎉 EMPIRICAL VERIFICATION COMPLETE: ALL ADVERSARIAL CHALLENGES PASSED!\n');
  } finally {
    console.log('[Cleanup] Removing ephemeral test records...');
    try {
      if (createdAssignmentIds.length > 0) {
        await prisma.academicAssignment.deleteMany({
          where: { id: { in: createdAssignmentIds } },
        });
      }
      if (createdSubjectIds.length > 0) {
        await prisma.academicSubject.deleteMany({
          where: { id: { in: createdSubjectIds } },
        });
      }
      if (createdAppointmentIds.length > 0) {
        await prisma.appointment.deleteMany({
          where: { id: { in: createdAppointmentIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
      console.log('[Cleanup] Ephemeral test records removed cleanly.');
    } catch (cleanupErr) {
      console.warn('[Cleanup] Warning during test cleanup:', cleanupErr);
    }
  }
}

runAdversarialVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ CHALLENGER 1 EMPIRICAL VERIFICATION FAILED:');
    console.error(err.message || err);
    process.exit(1);
  });
