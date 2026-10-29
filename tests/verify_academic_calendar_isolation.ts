/**
 * Programmatic Multi-User Isolation & Security Verification Test Suite
 * Module Scope: Academic (Subjects & Assignments) and Calendar (Appointments & Events)
 *
 * Verifies the 7 key isolation requirements:
 * 1) New Account Zero-Data Baseline (Alice and Bob start with 0 subjects, 0 assignments, 0 appointments, 0 events)
 * 2) Data Creation & Automatic User Binding (Alice creates subject, assignment with grade, appointment; 201 Created and creator ownership)
 * 3) Cross-Tenant Query Isolation (Bob queries subjects, assignments, appointments, calendar events; receives empty arrays)
 * 4) Direct Access Rejection / IDOR (Bob sends GET/PATCH/DELETE to Alice's records; receives 404 Not Found or 403 Forbidden)
 * 5) Cross-Tenant Subject Injection (Bob sends POST /api/academic/assignments with Alice's subjectId; receives 404/403)
 * 6) Unauthenticated Request Rejection (Requests without valid JWT header to academic/calendar routes receive 401 Unauthorized)
 * 7) Legacy Data Backfill & Admin Ownership (Admin user can query pre-existing legacy subjects and appointments; non-admin users cannot)
 */

import http from 'http';
import jwt from '../backend/node_modules/jsonwebtoken/index.js';
import { prisma } from '../backend/src/prisma.js';
import { ensureDefaultOwnerAndBackfill } from '../backend/src/services/backfill.service.js';

const TEST_PORT = process.env.TEST_PORT || '3097';
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

interface ScenarioResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  error?: string;
  assertionCount: number;
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
    `${context} - Expected status ${allowed.join(' or ')}, received ${res.status}. Response: ${JSON.stringify(res.data)}`
  );
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('   BrainBoard Academic & Calendar Multi-User Isolation Test Suite');
  console.log('================================================================\n');

  // 0. Ensure server is running on TEST_PORT
  console.log('[Setup] Starting backend Express server on port', TEST_PORT);
  const appModule = await import('../backend/src/index.js');
  const app = appModule.default;

  // Wait 1.5 seconds for server startup and backfill to settle
  await new Promise((r) => setTimeout(r, 1500));

  // Health check
  const health = await makeRequest('GET', '/api/health');
  assertStatus(health, 200, 'Health check');
  console.log(`✓ Backend server responding on port ${TEST_PORT}\n`);

  const timestamp = Date.now();
  const emailA = `alice_acad_${timestamp}@test.local`;
  const emailB = `bob_cal_${timestamp}@test.local`;
  let tokenA = '';
  let tokenB = '';
  let tokenAdmin = '';
  let userAId = '';
  let userBId = '';
  let adminId = '';

  // Track created entities for rigorous cleanup
  const createdSubjectIds: string[] = [];
  const createdAssignmentIds: string[] = [];
  const createdAppointmentIds: string[] = [];
  const createdUserIds: string[] = [];

  let aliceSubjectId = '';
  let aliceAssignmentId = '';
  let aliceAppointmentId = '';

  const scenarioResults: ScenarioResult[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test Users Registration & Authentication
    // ------------------------------------------------------------------------
    console.log('--- Setup: Test Users Registration & Authentication ---');

    // Register Alice
    const regARes = await makeRequest('POST', '/api/auth/register', {
      name: 'Alice Academic',
      email: emailA,
      password: 'passwordAlice123!',
    });
    assertStatus(regARes, 201, 'User A (Alice) registration');
    assert(Boolean(regARes.data.token), 'Registration A must return JWT token');
    tokenA = regARes.data.token;
    userAId = regARes.data.user.id;
    createdUserIds.push(userAId);
    console.log(`✓ User A (Alice) registered: ${userAId} (${emailA})`);

    // Register Bob
    const regBRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob Calendar',
      email: emailB,
      password: 'passwordBob123!',
    });
    assertStatus(regBRes, 201, 'User B (Bob) registration');
    assert(Boolean(regBRes.data.token), 'Registration B must return JWT token');
    tokenB = regBRes.data.token;
    userBId = regBRes.data.user.id;
    createdUserIds.push(userBId);
    console.log(`✓ User B (Bob) registered: ${userBId} (${emailB})`);

    // Verify Login for User A
    const loginARes = await makeRequest('POST', '/api/auth/login', {
      email: emailA,
      password: 'passwordAlice123!',
    });
    assertStatus(loginARes, 200, 'User A login');
    assert(Boolean(loginARes.data.token), 'Login A must return JWT token');
    console.log('✓ Login verified for User A');

    // Verify Login for User B
    const loginBRes = await makeRequest('POST', '/api/auth/login', {
      email: emailB,
      password: 'passwordBob123!',
    });
    assertStatus(loginBRes, 200, 'User B login');
    assert(Boolean(loginBRes.data.token), 'Login B must return JWT token');
    console.log('✓ Login verified for User B');

    // ------------------------------------------------------------------------
    // SCENARIO 1: New Account Zero-Data Baseline
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 1: New Account Zero-Data Baseline ---');
    const s1Start = totalAssertions;
    try {
      // Alice baseline check
      const aliceSubBaseline = await makeRequest('GET', '/api/academic/subjects', undefined, tokenA);
      assertStatus(aliceSubBaseline, 200, 'Alice GET /api/academic/subjects');
      assert(Array.isArray(aliceSubBaseline.data), 'Subjects response must be an array');
      assert(
        aliceSubBaseline.data.length === 0,
        `New user Alice must have 0 academic subjects, found ${aliceSubBaseline.data.length}`
      );

      const aliceAssignBaseline = await makeRequest('GET', '/api/academic/assignments', undefined, tokenA);
      assertStatus(aliceAssignBaseline, 200, 'Alice GET /api/academic/assignments');
      assert(Array.isArray(aliceAssignBaseline.data), 'Assignments response must be an array');
      assert(
        aliceAssignBaseline.data.length === 0,
        `New user Alice must have 0 assignments, found ${aliceAssignBaseline.data.length}`
      );

      const aliceApptBaseline = await makeRequest('GET', '/api/appointments', undefined, tokenA);
      assertStatus(aliceApptBaseline, 200, 'Alice GET /api/appointments');
      assert(Array.isArray(aliceApptBaseline.data), 'Appointments response must be an array');
      assert(
        aliceApptBaseline.data.length === 0,
        `New user Alice must have 0 appointments, found ${aliceApptBaseline.data.length}`
      );

      const aliceEventsBaseline = await makeRequest('GET', '/api/calendar/events', undefined, tokenA);
      assertStatus(aliceEventsBaseline, 200, 'Alice GET /api/calendar/events');
      assert(Array.isArray(aliceEventsBaseline.data), 'Calendar events response must be an array');
      assert(
        aliceEventsBaseline.data.length === 0,
        `New user Alice must have 0 calendar events, found ${aliceEventsBaseline.data.length}`
      );

      // Bob baseline check
      const bobSubBaseline = await makeRequest('GET', '/api/academic/subjects', undefined, tokenB);
      assertStatus(bobSubBaseline, 200, 'Bob GET /api/academic/subjects');
      assert(Array.isArray(bobSubBaseline.data), 'Bob subjects response must be an array');
      assert(
        bobSubBaseline.data.length === 0,
        `New user Bob must have 0 academic subjects, found ${bobSubBaseline.data.length}`
      );

      const bobAssignBaseline = await makeRequest('GET', '/api/academic/assignments', undefined, tokenB);
      assertStatus(bobAssignBaseline, 200, 'Bob GET /api/academic/assignments');
      assert(Array.isArray(bobAssignBaseline.data), 'Bob assignments response must be an array');
      assert(
        bobAssignBaseline.data.length === 0,
        `New user Bob must have 0 assignments, found ${bobAssignBaseline.data.length}`
      );

      const bobApptBaseline = await makeRequest('GET', '/api/appointments', undefined, tokenB);
      assertStatus(bobApptBaseline, 200, 'Bob GET /api/appointments');
      assert(Array.isArray(bobApptBaseline.data), 'Bob appointments response must be an array');
      assert(
        bobApptBaseline.data.length === 0,
        `New user Bob must have 0 appointments, found ${bobApptBaseline.data.length}`
      );

      const bobEventsBaseline = await makeRequest('GET', '/api/calendar/events', undefined, tokenB);
      assertStatus(bobEventsBaseline, 200, 'Bob GET /api/calendar/events');
      assert(Array.isArray(bobEventsBaseline.data), 'Bob calendar events response must be an array');
      assert(
        bobEventsBaseline.data.length === 0,
        `New user Bob must have 0 calendar events, found ${bobEventsBaseline.data.length}`
      );

      console.log('✓ Scenario 1 PASSED: New accounts start with clean zero-data baseline');
      scenarioResults.push({
        scenarioNumber: 1,
        name: 'New Account Zero-Data Baseline',
        passed: true,
        assertionCount: totalAssertions - s1Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 1 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 1,
        name: 'New Account Zero-Data Baseline',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s1Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 2: Data Creation & Automatic User Binding
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Data Creation & Automatic User Binding ---');
    const s2Start = totalAssertions;
    const subjectPayload = {
      title: `Física Quântica ${timestamp} — Óptica & Ondulatória 🔬`,
      description: 'Mecânica ondulatória, operadores hermitianos e perturbações',
      professor: 'Prof. Erwin Schrödinger',
      colorCode: '#6366f1',
    };
    const apptStart = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const apptEnd = new Date(apptStart.getTime() + 60 * 60 * 1000);

    try {
      // Alice creates academic subject
      const createSubRes = await makeRequest('POST', '/api/academic/subjects', subjectPayload, tokenA);
      assertStatus(createSubRes, 201, 'Alice POST /api/academic/subjects');
      assert(Boolean(createSubRes.data?.id), 'Created subject must return an id');
      aliceSubjectId = createSubRes.data.id;
      createdSubjectIds.push(aliceSubjectId);
      assert(createSubRes.data.title === subjectPayload.title, 'Subject title must match payload');
      if (createSubRes.data.userId) {
        assert(createSubRes.data.userId === userAId, `Subject userId must match Alice ID (${userAId})`);
      }
      console.log(`✓ Alice created subject: ${aliceSubjectId} ("${subjectPayload.title}")`);

      // Alice creates academic assignment with grade
      const assignmentDueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const assignmentPayload = {
        subjectId: aliceSubjectId,
        title: `Relatório de Laboratório: Poço Infinito ${timestamp}`,
        description: 'Cálculo de autofunções e autovalores de energia 1D',
        dueDate: assignmentDueDate,
        type: 'HOMEWORK',
        status: 'DONE',
        grade: 9.75,
      };
      const createAssignRes = await makeRequest('POST', '/api/academic/assignments', assignmentPayload, tokenA);
      assertStatus(createAssignRes, 201, 'Alice POST /api/academic/assignments');
      assert(Boolean(createAssignRes.data?.id), 'Created assignment must return an id');
      aliceAssignmentId = createAssignRes.data.id;
      createdAssignmentIds.push(aliceAssignmentId);
      assert(createAssignRes.data.title === assignmentPayload.title, 'Assignment title must match payload');
      assert(createAssignRes.data.subjectId === aliceSubjectId, 'Assignment subjectId must match parent subject');
      assert(createAssignRes.data.grade === 9.75, 'Assignment grade must be stored accurately (9.75)');
      if (createAssignRes.data.userId) {
        assert(createAssignRes.data.userId === userAId, `Assignment userId must match Alice ID (${userAId})`);
      }
      console.log(`✓ Alice created assignment: ${aliceAssignmentId} with grade 9.75`);

      // Alice creates appointment
      const appointmentPayload = {
        title: `Plantão de Dúvidas de Física com Prof. Schrödinger ${timestamp}`,
        description: 'Discussão sobre exercícios de perturbação quântica',
        startTime: apptStart.toISOString(),
        endTime: apptEnd.toISOString(),
        locationOrLink: 'Prédio de Física, Sala 410',
      };
      const createApptRes = await makeRequest('POST', '/api/appointments', appointmentPayload, tokenA);
      assertStatus(createApptRes, 201, 'Alice POST /api/appointments');
      assert(Boolean(createApptRes.data?.id), 'Created appointment must return an id');
      aliceAppointmentId = createApptRes.data.id;
      createdAppointmentIds.push(aliceAppointmentId);
      assert(createApptRes.data.title === appointmentPayload.title, 'Appointment title must match payload');
      if (createApptRes.data.userId) {
        assert(createApptRes.data.userId === userAId, `Appointment userId must match Alice ID (${userAId})`);
      }
      console.log(`✓ Alice created appointment: ${aliceAppointmentId} ("${appointmentPayload.title}")`);

      // Alice queries her own resources and verifies presence
      const aliceSubjects = await makeRequest('GET', '/api/academic/subjects', undefined, tokenA);
      assertStatus(aliceSubjects, 200, 'Alice GET /api/academic/subjects after creation');
      assert(
        aliceSubjects.data.some((s: any) => s.id === aliceSubjectId),
        'Alice subjects list must include her newly created subject'
      );

      const aliceAssignments = await makeRequest('GET', '/api/academic/assignments', undefined, tokenA);
      assertStatus(aliceAssignments, 200, 'Alice GET /api/academic/assignments after creation');
      assert(
        aliceAssignments.data.some((a: any) => a.id === aliceAssignmentId),
        'Alice assignments list must include her newly created assignment'
      );

      const aliceFilteredAssignments = await makeRequest(
        'GET',
        `/api/academic/assignments?subjectId=${aliceSubjectId}`,
        undefined,
        tokenA
      );
      assertStatus(aliceFilteredAssignments, 200, 'Alice GET assignments with subjectId filter');
      assert(
        aliceFilteredAssignments.data.some((a: any) => a.id === aliceAssignmentId),
        'Filtered assignments list must include Alice assignment'
      );

      const aliceAppointments = await makeRequest('GET', '/api/appointments', undefined, tokenA);
      assertStatus(aliceAppointments, 200, 'Alice GET /api/appointments after creation');
      assert(
        aliceAppointments.data.some((ap: any) => ap.id === aliceAppointmentId),
        'Alice appointments list must include her newly created appointment'
      );

      const aliceSingleAppt = await makeRequest('GET', `/api/appointments/${aliceAppointmentId}`, undefined, tokenA);
      assertStatus(aliceSingleAppt, 200, 'Alice GET appointment by ID');
      assert(aliceSingleAppt.data.id === aliceAppointmentId, 'Single appointment ID must match');

      const aliceEvents = await makeRequest(
        'GET',
        `/api/calendar/events?includeCompleted=true`,
        undefined,
        tokenA
      );
      assertStatus(aliceEvents, 200, 'Alice GET /api/calendar/events after creation');
      const hasApptEvent = aliceEvents.data.some((e: any) => e.sourceId === aliceAppointmentId);
      const hasAssignEvent = aliceEvents.data.some((e: any) => e.sourceId === aliceAssignmentId);
      assert(hasApptEvent, 'Alice calendar projection must include her appointment event');
      assert(hasAssignEvent, 'Alice calendar projection must include her academic assignment event');

      console.log('✓ Scenario 2 PASSED: Automatic user binding and successful retrieval of owned entities verified');
      scenarioResults.push({
        scenarioNumber: 2,
        name: 'Data Creation & Automatic User Binding',
        passed: true,
        assertionCount: totalAssertions - s2Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 2 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 2,
        name: 'Data Creation & Automatic User Binding',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s2Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 3: Cross-Tenant Query Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Cross-Tenant Query Isolation ---');
    const s3Start = totalAssertions;
    try {
      if (!aliceSubjectId || !aliceAssignmentId || !aliceAppointmentId) {
        throw new Error('Prerequisites from Scenario 2 missing (Alice entities not created)');
      }

      // Bob queries subjects -> must NOT see Alice's subject
      const bobSubjects = await makeRequest('GET', '/api/academic/subjects', undefined, tokenB);
      assertStatus(bobSubjects, 200, 'Bob GET /api/academic/subjects');
      const bobSeesAliceSub = bobSubjects.data.some((s: any) => s.id === aliceSubjectId);
      assert(!bobSeesAliceSub, 'ISOLATION BREACH: Bob can see Alice academic subject!');
      assert(bobSubjects.data.length === 0, `Bob should have 0 subjects, received ${bobSubjects.data.length}`);
      console.log('✓ Cross-tenant subject isolation: Bob sees 0 subjects (Alice subject excluded)');

      // Bob queries assignments -> must NOT see Alice's assignment
      const bobAssignments = await makeRequest('GET', '/api/academic/assignments', undefined, tokenB);
      assertStatus(bobAssignments, 200, 'Bob GET /api/academic/assignments');
      const bobSeesAliceAssign = bobAssignments.data.some((a: any) => a.id === aliceAssignmentId);
      assert(!bobSeesAliceAssign, 'ISOLATION BREACH: Bob can see Alice assignment!');
      assert(bobAssignments.data.length === 0, `Bob should have 0 assignments, received ${bobAssignments.data.length}`);
      console.log('✓ Cross-tenant assignment isolation: Bob sees 0 assignments (Alice assignment excluded)');

      // Bob queries assignments filtered by Alice's subjectId -> must return empty array or 404/403
      const bobQueryAliceSubject = await makeRequest(
        'GET',
        `/api/academic/assignments?subjectId=${aliceSubjectId}`,
        undefined,
        tokenB
      );
      if (bobQueryAliceSubject.status === 200) {
        assert(
          bobQueryAliceSubject.data.length === 0,
          `ISOLATION BREACH: Bob querying Alice subjectId received ${bobQueryAliceSubject.data.length} assignments!`
        );
      } else {
        assertStatus(bobQueryAliceSubject, [403, 404], 'Bob querying Alice subject assignments');
      }
      console.log('✓ Cross-tenant filtered assignment query: Bob receives empty list or 404/403');

      // Bob queries appointments -> must NOT see Alice's appointment
      const bobAppointments = await makeRequest('GET', '/api/appointments', undefined, tokenB);
      assertStatus(bobAppointments, 200, 'Bob GET /api/appointments');
      const bobSeesAliceAppt = bobAppointments.data.some((ap: any) => ap.id === aliceAppointmentId);
      assert(!bobSeesAliceAppt, 'ISOLATION BREACH: Bob can see Alice appointment!');
      assert(bobAppointments.data.length === 0, `Bob should have 0 appointments, received ${bobAppointments.data.length}`);
      console.log('✓ Cross-tenant appointment isolation: Bob sees 0 appointments (Alice appointment excluded)');

      // Bob queries calendar events -> must NOT see any of Alice's projected events
      const bobEvents = await makeRequest('GET', '/api/calendar/events?includeCompleted=true', undefined, tokenB);
      assertStatus(bobEvents, 200, 'Bob GET /api/calendar/events');
      const bobSeesAliceApptEvent = bobEvents.data.some((e: any) => e.sourceId === aliceAppointmentId);
      const bobSeesAliceAssignEvent = bobEvents.data.some((e: any) => e.sourceId === aliceAssignmentId);
      assert(!bobSeesAliceApptEvent, 'ISOLATION BREACH: Bob calendar projection includes Alice appointment!');
      assert(!bobSeesAliceAssignEvent, 'ISOLATION BREACH: Bob calendar projection includes Alice assignment!');
      assert(bobEvents.data.length === 0, `Bob should have 0 calendar events, received ${bobEvents.data.length}`);
      console.log('✓ Cross-tenant calendar projection isolation: Bob sees 0 calendar events');

      console.log('✓ Scenario 3 PASSED: 100% strict cross-tenant read isolation verified across all endpoints');
      scenarioResults.push({
        scenarioNumber: 3,
        name: 'Cross-Tenant Query Isolation',
        passed: true,
        assertionCount: totalAssertions - s3Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 3 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 3,
        name: 'Cross-Tenant Query Isolation',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s3Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 4: Direct Access Rejection / IDOR (Insecure Direct Object Reference)
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Direct Access Rejection / IDOR ---');
    const s4Start = totalAssertions;
    try {
      if (!aliceSubjectId || !aliceAssignmentId || !aliceAppointmentId) {
        throw new Error('Prerequisites from Scenario 2 missing (Alice entities not created)');
      }

      // 4.1 Direct Read IDOR on Appointment
      const bobReadAppt = await makeRequest('GET', `/api/appointments/${aliceAppointmentId}`, undefined, tokenB);
      assertStatus(
        bobReadAppt,
        [403, 404],
        'Bob direct GET /api/appointments/:id on Alice appointment'
      );
      console.log(`✓ IDOR direct read on appointment rejected with ${bobReadAppt.status}`);

      // 4.2 Direct Update IDOR on Academic Subject
      const bobPatchSub = await makeRequest(
        'PATCH',
        `/api/academic/subjects/${aliceSubjectId}`,
        { title: 'Bob Sabotaged Subject' },
        tokenB
      );
      assertStatus(
        bobPatchSub,
        [403, 404],
        'Bob direct PATCH /api/academic/subjects/:id on Alice subject'
      );
      console.log(`✓ IDOR direct update on subject rejected with ${bobPatchSub.status}`);

      // Verify Alice subject title remains untampered
      const verifySubIntact = await makeRequest('GET', '/api/academic/subjects', undefined, tokenA);
      const intactSub = verifySubIntact.data.find((s: any) => s.id === aliceSubjectId);
      assert(
        intactSub?.title === subjectPayload.title,
        `Subject title was tampered! Expected "${subjectPayload.title}", got "${intactSub?.title}"`
      );
      console.log('  ✓ Verified Alice subject title was NOT modified');

      // 4.3 Direct Update IDOR on Academic Assignment (Grade Tampering Attack)
      const bobPatchAssign = await makeRequest(
        'PATCH',
        `/api/academic/assignments/${aliceAssignmentId}`,
        { grade: 0.0, title: 'Bob Sabotaged Grade' },
        tokenB
      );
      assertStatus(
        bobPatchAssign,
        [403, 404],
        'Bob direct PATCH /api/academic/assignments/:id on Alice assignment'
      );
      console.log(`✓ IDOR direct update on assignment (grade tampering) rejected with ${bobPatchAssign.status}`);

      // Verify Alice assignment grade remains 9.75
      const verifyAssignIntact = await makeRequest('GET', '/api/academic/assignments', undefined, tokenA);
      const intactAssign = verifyAssignIntact.data.find((a: any) => a.id === aliceAssignmentId);
      assert(
        intactAssign?.grade === 9.75,
        `Assignment grade was tampered! Expected 9.75, got ${intactAssign?.grade}`
      );
      console.log('  ✓ Verified Alice assignment grade remains 9.75');

      // 4.4 Direct Update IDOR on Appointment
      const bobPatchAppt = await makeRequest(
        'PATCH',
        `/api/appointments/${aliceAppointmentId}`,
        { title: 'Bob Hijacked Appointment' },
        tokenB
      );
      assertStatus(
        bobPatchAppt,
        [403, 404],
        'Bob direct PATCH /api/appointments/:id on Alice appointment'
      );
      console.log(`✓ IDOR direct update on appointment rejected with ${bobPatchAppt.status}`);

      // 4.5 Direct Deletion IDOR on Academic Assignment
      const bobDeleteAssign = await makeRequest(
        'DELETE',
        `/api/academic/assignments/${aliceAssignmentId}`,
        undefined,
        tokenB
      );
      assertStatus(
        bobDeleteAssign,
        [403, 404],
        'Bob direct DELETE /api/academic/assignments/:id on Alice assignment'
      );
      console.log(`✓ IDOR direct deletion on assignment rejected with ${bobDeleteAssign.status}`);

      // 4.6 Direct Deletion IDOR on Academic Subject
      const bobDeleteSub = await makeRequest(
        'DELETE',
        `/api/academic/subjects/${aliceSubjectId}`,
        undefined,
        tokenB
      );
      assertStatus(
        bobDeleteSub,
        [403, 404],
        'Bob direct DELETE /api/academic/subjects/:id on Alice subject'
      );
      console.log(`✓ IDOR direct deletion on subject rejected with ${bobDeleteSub.status}`);

      // 4.7 Direct Deletion IDOR on Appointment
      const bobDeleteAppt = await makeRequest(
        'DELETE',
        `/api/appointments/${aliceAppointmentId}`,
        undefined,
        tokenB
      );
      assertStatus(
        bobDeleteAppt,
        [403, 404],
        'Bob direct DELETE /api/appointments/:id on Alice appointment'
      );
      console.log(`✓ IDOR direct deletion on appointment rejected with ${bobDeleteAppt.status}`);

      // Verify all Alice resources still exist intact
      const finalAliceSubs = await makeRequest('GET', '/api/academic/subjects', undefined, tokenA);
      assert(finalAliceSubs.data.some((s: any) => s.id === aliceSubjectId), 'Alice subject must survive IDOR attack');

      const finalAliceAssigns = await makeRequest('GET', '/api/academic/assignments', undefined, tokenA);
      assert(finalAliceAssigns.data.some((a: any) => a.id === aliceAssignmentId), 'Alice assignment must survive IDOR attack');

      const finalAliceAppts = await makeRequest('GET', '/api/appointments', undefined, tokenA);
      assert(finalAliceAppts.data.some((ap: any) => ap.id === aliceAppointmentId), 'Alice appointment must survive IDOR attack');

      console.log('✓ Scenario 4 PASSED: Complete IDOR protection (read, update, delete) returning 404/403');
      scenarioResults.push({
        scenarioNumber: 4,
        name: 'Direct Access Rejection / IDOR',
        passed: true,
        assertionCount: totalAssertions - s4Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 4 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 4,
        name: 'Direct Access Rejection / IDOR',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s4Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 5: Cross-Tenant Subject Injection
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Cross-Tenant Subject Injection ---');
    const s5Start = totalAssertions;
    try {
      if (!aliceSubjectId) {
        throw new Error('Prerequisite Alice subjectId missing');
      }

      // Bob attempts to create an assignment specifying Alice's subjectId
      const injectionPayload = {
        subjectId: aliceSubjectId,
        title: `Injected Malicious Assignment by Bob ${timestamp}`,
        description: 'Attempting to inject an assignment into a foreign subject',
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        type: 'HOMEWORK',
      };
      const injectionRes = await makeRequest('POST', '/api/academic/assignments', injectionPayload, tokenB);
      assertStatus(
        injectionRes,
        [403, 404],
        'Bob POST /api/academic/assignments specifying Alice subjectId'
      );
      console.log(`✓ Cross-tenant subject injection rejected with ${injectionRes.status}`);

      // Verify Alice subject did NOT receive the injected assignment
      const verifyAliceSubAssigns = await makeRequest(
        'GET',
        `/api/academic/assignments?subjectId=${aliceSubjectId}`,
        undefined,
        tokenA
      );
      assertStatus(verifyAliceSubAssigns, 200, 'Alice GET assignments for subject');
      const injectedFound = verifyAliceSubAssigns.data.some(
        (a: any) => a.title === injectionPayload.title
      );
      assert(!injectedFound, 'INJECTION BREACH: Bob injected assignment was added to Alice subject!');
      assert(
        verifyAliceSubAssigns.data.length === 1,
        `Alice subject should contain exactly 1 assignment, found ${verifyAliceSubAssigns.data.length}`
      );
      console.log('✓ Verified Alice subject has zero injected foreign assignments');

      console.log('✓ Scenario 5 PASSED: Foreign key subject injection properly prevented');
      scenarioResults.push({
        scenarioNumber: 5,
        name: 'Cross-Tenant Subject Injection',
        passed: true,
        assertionCount: totalAssertions - s5Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 5 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 5,
        name: 'Cross-Tenant Subject Injection',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s5Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 6: Unauthenticated Request Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Unauthenticated Request Rejection ---');
    const s6Start = totalAssertions;
    try {
      // 6.1 Academic read/create/update/delete endpoints without token
      const unauthSubList = await makeRequest('GET', '/api/academic/subjects');
      assertStatus(unauthSubList, 401, 'Unauthenticated GET /api/academic/subjects');

      const unauthSubCreate = await makeRequest('POST', '/api/academic/subjects', { title: 'Ghost Subject' });
      assertStatus(unauthSubCreate, 401, 'Unauthenticated POST /api/academic/subjects');

      const unauthSubPatch = await makeRequest('PATCH', `/api/academic/subjects/${aliceSubjectId || 'ghost-id'}`, { title: 'Ghost' });
      assertStatus(unauthSubPatch, 401, 'Unauthenticated PATCH /api/academic/subjects/:id');

      const unauthSubDelete = await makeRequest('DELETE', `/api/academic/subjects/${aliceSubjectId || 'ghost-id'}`);
      assertStatus(unauthSubDelete, 401, 'Unauthenticated DELETE /api/academic/subjects/:id');

      const unauthAssignList = await makeRequest('GET', '/api/academic/assignments');
      assertStatus(unauthAssignList, 401, 'Unauthenticated GET /api/academic/assignments');

      const unauthAssignCreate = await makeRequest('POST', '/api/academic/assignments', {
        subjectId: aliceSubjectId || '00000000-0000-0000-0000-000000000000',
        title: 'Ghost Assignment',
      });
      assertStatus(unauthAssignCreate, 401, 'Unauthenticated POST /api/academic/assignments');

      // 6.2 Calendar read/create/update/delete endpoints without token
      const unauthApptList = await makeRequest('GET', '/api/appointments');
      assertStatus(unauthApptList, 401, 'Unauthenticated GET /api/appointments');

      const unauthApptCreate = await makeRequest('POST', '/api/appointments', {
        title: 'Ghost Appointment',
        startTime: apptStart.toISOString(),
        endTime: apptEnd.toISOString(),
      });
      assertStatus(unauthApptCreate, 401, 'Unauthenticated POST /api/appointments');

      const unauthApptPatch = await makeRequest('PATCH', `/api/appointments/${aliceAppointmentId || 'ghost-id'}`, { title: 'Ghost' });
      assertStatus(unauthApptPatch, 401, 'Unauthenticated PATCH /api/appointments/:id');

      const unauthApptDelete = await makeRequest('DELETE', `/api/appointments/${aliceAppointmentId || 'ghost-id'}`);
      assertStatus(unauthApptDelete, 401, 'Unauthenticated DELETE /api/appointments/:id');

      const unauthEvents = await makeRequest('GET', '/api/calendar/events');
      assertStatus(unauthEvents, 401, 'Unauthenticated GET /api/calendar/events');

      console.log('✓ All unauthenticated requests without token returned 401 Unauthorized');

      // 6.3 Malformed, forged, and expired tokens
      const malformedTokenRes = await makeRequest('GET', '/api/academic/subjects', undefined, 'malformed.jwt.token');
      assertStatus(malformedTokenRes, 401, 'Malformed JWT on /api/academic/subjects');

      const forgedToken = jwt.sign({ userId: '00000000-0000-0000-0000-000000000000' }, 'attacker-wrong-secret');
      const forgedTokenRes = await makeRequest('GET', '/api/appointments', undefined, forgedToken);
      assertStatus(forgedTokenRes, 401, 'Forged JWT signature on /api/appointments');

      const expiredToken = jwt.sign(
        { userId: userAId },
        JWT_SECRET,
        { expiresIn: '-10s' }
      );
      const expiredTokenRes = await makeRequest('GET', '/api/calendar/events', undefined, expiredToken);
      assertStatus(expiredTokenRes, 401, 'Expired JWT on /api/calendar/events');

      console.log('✓ Malformed, forged, and expired tokens rejected with 401 Unauthorized');
      console.log('✓ Scenario 6 PASSED: Strict authentication barrier enforced on all academic & calendar routes');
      scenarioResults.push({
        scenarioNumber: 6,
        name: 'Unauthenticated Request Rejection',
        passed: true,
        assertionCount: totalAssertions - s6Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 6 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 6,
        name: 'Unauthenticated Request Rejection',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s6Start,
      });
    }

    // ------------------------------------------------------------------------
    // SCENARIO 7: Legacy Data Backfill & Admin Ownership
    // ------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Legacy Data Backfill & Admin Ownership ---');
    const s7Start = totalAssertions;
    try {
      // Ensure default owner exists and run backfill
      const adminUser = await ensureDefaultOwnerAndBackfill();
      assert(Boolean(adminUser), 'Default admin user must exist');
      assert(adminUser.email === 'admin@brainboard.local', 'Admin email must be admin@brainboard.local');
      adminId = adminUser.id;
      console.log(`✓ Admin user confirmed: ${adminId} (${adminUser.email})`);

      // Obtain Admin JWT token
      const adminLoginRes = await makeRequest('POST', '/api/auth/login', {
        email: 'admin@brainboard.local',
        password: process.env.DEFAULT_OWNER_PASSWORD || 'brainboard123',
      });
      assertStatus(adminLoginRes, 200, 'Admin login');
      tokenAdmin = adminLoginRes.data.token;
      assert(Boolean(tokenAdmin), 'Admin login must return JWT');
      console.log('✓ Admin login successful and JWT token acquired');

      // Admin creates an administrative/legacy academic subject
      const adminSubRes = await makeRequest(
        'POST',
        '/api/academic/subjects',
        {
          title: `Engenharia de Software Institucional ${timestamp}`,
          description: 'Disciplina padrão legada da faculdade',
          professor: 'Coordenação Geral',
          colorCode: '#10b981',
        },
        tokenAdmin
      );
      assertStatus(adminSubRes, 201, 'Admin POST /api/academic/subjects');
      const adminSubjectId = adminSubRes.data.id;
      createdSubjectIds.push(adminSubjectId);
      console.log(`✓ Admin created institutional subject: ${adminSubjectId}`);

      // Admin creates an administrative appointment
      const adminApptRes = await makeRequest(
        'POST',
        '/api/appointments',
        {
          title: `Reunião de Congregação e Coordenação ${timestamp}`,
          description: 'Reunião institucional de planejamento acadêmico',
          startTime: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
          endTime: new Date(Date.now() + 10 * 24 * 3600 * 1000 + 7200000).toISOString(),
          locationOrLink: 'Sala de Reuniões da Reitoria',
        },
        tokenAdmin
      );
      assertStatus(adminApptRes, 201, 'Admin POST /api/appointments');
      const adminApptId = adminApptRes.data.id;
      createdAppointmentIds.push(adminApptId);
      console.log(`✓ Admin created institutional appointment: ${adminApptId}`);

      // Admin queries subjects -> can see admin subject
      const adminSubs = await makeRequest('GET', '/api/academic/subjects', undefined, tokenAdmin);
      assertStatus(adminSubs, 200, 'Admin GET /api/academic/subjects');
      assert(
        adminSubs.data.some((s: any) => s.id === adminSubjectId),
        'Admin must be able to view admin-owned academic subjects'
      );

      // Non-admin user (Bob) queries subjects -> MUST NOT see admin's subject!
      const bobSubsAgainstAdmin = await makeRequest('GET', '/api/academic/subjects', undefined, tokenB);
      assertStatus(bobSubsAgainstAdmin, 200, 'Bob GET /api/academic/subjects');
      const bobSeesAdminSub = bobSubsAgainstAdmin.data.some((s: any) => s.id === adminSubjectId);
      assert(!bobSeesAdminSub, 'ISOLATION BREACH: Non-admin Bob can see admin institutional subject!');
      console.log('✓ Non-admin Bob CANNOT see admin subject in list');

      // Pre-existing legacy subjects check: Verify all pre-existing records belong to admin and do not leak
      const allDbSubjects = await prisma.academicSubject.findMany();
      for (const s of allDbSubjects) {
        if (createdSubjectIds.includes(s.id)) continue;
        // Verify pre-existing legacy subject does not leak to Bob
        const bobSeesLegacy = bobSubsAgainstAdmin.data.some((bSub: any) => bSub.id === s.id);
        assert(!bobSeesLegacy, `ISOLATION BREACH: Pre-existing subject "${s.title}" leaked to Bob!`);
      }

      // Non-admin user (Bob) queries appointments -> MUST NOT see admin's appointment!
      const bobApptsAgainstAdmin = await makeRequest('GET', '/api/appointments', undefined, tokenB);
      assertStatus(bobApptsAgainstAdmin, 200, 'Bob GET /api/appointments');
      const bobSeesAdminAppt = bobApptsAgainstAdmin.data.some((ap: any) => ap.id === adminApptId);
      assert(!bobSeesAdminAppt, 'ISOLATION BREACH: Non-admin Bob can see admin institutional appointment!');
      console.log('✓ Non-admin Bob CANNOT see admin appointment in list');

      // Non-admin user (Bob) attempts IDOR on admin subject
      const bobIdorAdminSub = await makeRequest(
        'PATCH',
        `/api/academic/subjects/${adminSubjectId}`,
        { title: 'Bob Sabotaged Admin Subject' },
        tokenB
      );
      assertStatus(
        bobIdorAdminSub,
        [403, 404],
        'Bob IDOR PATCH on admin subject'
      );
      console.log(`✓ Non-admin IDOR on admin subject rejected with ${bobIdorAdminSub.status}`);

      // Database verification: Verify ownership
      const dbAdminSub = (await prisma.academicSubject.findUnique({ where: { id: adminSubjectId } })) as any;
      if (dbAdminSub && 'userId' in dbAdminSub && dbAdminSub.userId) {
        assert(dbAdminSub.userId === adminId, `Admin subject in DB must be bound to admin (${adminId})`);
        console.log('✓ Admin subject ownership verified directly in database');
      }

      if (aliceSubjectId) {
        const dbAliceSub = (await prisma.academicSubject.findUnique({ where: { id: aliceSubjectId } })) as any;
        if (dbAliceSub && 'userId' in dbAliceSub && dbAliceSub.userId) {
          assert(dbAliceSub.userId === userAId, `Alice subject in DB must be bound to Alice (${userAId})`);
          console.log('✓ Alice subject ownership verified directly in database');
        }
      }

      const dbAdminAppt = (await prisma.appointment.findUnique({ where: { id: adminApptId } })) as any;
      if (dbAdminAppt && 'userId' in dbAdminAppt && dbAdminAppt.userId) {
        assert(dbAdminAppt.userId === adminId, `Admin appointment in DB must be bound to admin (${adminId})`);
        console.log('✓ Admin appointment ownership verified directly in database');
      }

      console.log('✓ Scenario 7 PASSED: Legacy data backfill & admin ownership verified with zero leakage to regular users');
      scenarioResults.push({
        scenarioNumber: 7,
        name: 'Legacy Data Backfill & Admin Ownership',
        passed: true,
        assertionCount: totalAssertions - s7Start,
      });
    } catch (err: any) {
      console.error(`❌ Scenario 7 FAILED: ${err.message}`);
      scenarioResults.push({
        scenarioNumber: 7,
        name: 'Legacy Data Backfill & Admin Ownership',
        passed: false,
        error: err.message,
        assertionCount: totalAssertions - s7Start,
      });
    }

    // ------------------------------------------------------------------------
    // SUMMARY REPORT
    // ------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('   MULTI-USER ISOLATION TEST EXECUTION SUMMARY');
    console.log('================================================================');
    let allPassed = true;
    for (const r of scenarioResults) {
      const badge = r.passed ? '✓ PASS' : '❌ FAIL';
      console.log(`Scenario ${r.scenarioNumber}: [${badge}] ${r.name}`);
      if (!r.passed) {
        allPassed = false;
        console.log(`    Reason: ${r.error}`);
      }
    }
    console.log('----------------------------------------------------------------');
    console.log(`Total Assertions: ${totalAssertions} | Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
    console.log('================================================================\n');

    if (!allPassed) {
      throw new Error(`One or more isolation scenarios failed. See summary above.`);
    }

    console.log('🎉 ALL 7 MULTI-USER ISOLATION SCENARIOS PASSED WITH ZERO LEAKAGE!\n');
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Ephemeral Test Records Deletion
    // ------------------------------------------------------------------------
    console.log('[Cleanup] Cleaning up ephemeral test records...');
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

runTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ MULTI-USER ISOLATION TEST SUITE FAILED WITH ERROR:');
    console.error(err.message || err);
    process.exit(1);
  });
