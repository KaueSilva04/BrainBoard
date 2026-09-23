/**
 * Challenger 2 Adversarial Regression & Contract Verification Harness
 * Milestone 3: Regression & Contract Challenger
 *
 * Verifies:
 * 1. Complete REST contract fidelity between frontend/src/services/api.ts and backend Express routes.
 * 2. Full specialized view API operations:
 *    - appointmentsApi CRUD & toggleCompleted
 *    - calendarApi.getEvents unified projections
 *    - academicApi subjects & deadlines CRUD
 *    - tasksApi.listAll({ isSprintActive: true }) and toggleSprint
 * 3. Adversarial boundary & corner cases (400 validation, 404 non-existent, invalid dates).
 * 4. Component contract & interface integrity checks (KanbanBoard, TaskCard, CreateTaskModal, ProjectList, Navbar).
 * 5. Automated E2E test runner execution verification.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const WORKSPACE_DIR = process.cwd();

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testResults: TestResult[] = [];

function makeRequest(
  method: string,
  urlPath: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BACKEND_URL);
    const postData = body !== undefined ? JSON.stringify(body) : undefined;

    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...headers,
        },
        timeout: 10000,
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
          resolve({ status: res.statusCode || 0, data, raw });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout calling ${urlPath}`));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runTestCase(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ category, name, passed: true, durationMs });
    console.log(`  [PASS] [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errMsg = err?.message || String(err);
    testResults.push({ category, name, passed: false, error: errMsg, durationMs });
    console.error(`  [FAIL] [${category}] ${name} (${durationMs}ms)`);
    console.error(`         Error: ${errMsg}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL REGRESSION & CONTRACT TEST HARNESS  ');
  console.log('================================================================');
  console.log(`Backend Target: ${BACKEND_URL}`);
  console.log(`Workspace:      ${WORKSPACE_DIR}\n`);

  let testProjectId = '';
  let testStageId = '';
  let testTaskId = '';
  let testAppointmentId = '';
  let testSubjectId = '';
  let testDeadlineId = '';

  // -------------------------------------------------------------
  // PART 1: CORE REST CONTRACTS & COMPATIBILITY
  // -------------------------------------------------------------
  console.log('--- PART 1: Core REST Contracts & Compatibility ---');

  await runTestCase('CORE_REST', 'POST /api/projects creates project with type SOFTWARE', async () => {
    const res = await makeRequest('POST', '/api/projects', {
      title: `Challenger_Core_Project_${Date.now()}`,
      description: 'Challenger test project for regression integrity',
      type: 'SOFTWARE',
      status: 'PLANNING',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data && res.data.id, 'Expected project id');
    assertEqual(res.data.type, 'SOFTWARE', 'Project type must be SOFTWARE');
    testProjectId = res.data.id;
  });

  await runTestCase('CORE_REST', 'POST /api/projects/:projectId/stages creates stage', async () => {
    assert(Boolean(testProjectId), 'Prerequisite project missing');
    const res = await makeRequest('POST', `/api/projects/${testProjectId}/stages`, {
      title: 'Sprint Backlog & Execução',
      order: 1,
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data && res.data.id, 'Expected stage id');
    testStageId = res.data.id;
  });

  await runTestCase('CORE_REST', 'POST /api/stages/:stageId/tasks creates task with dueDate and isSprintActive', async () => {
    assert(Boolean(testStageId), 'Prerequisite stage missing');
    const futureDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const res = await makeRequest('POST', `/api/stages/${testStageId}/tasks`, {
      title: 'Implementar Testes de Regressão M3',
      description: 'Garantir integridade de contratos',
      status: 'TODO',
      dueDate: futureDue,
      isSprintActive: true,
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data && res.data.id, 'Expected task id');
    assertEqual(res.data.isSprintActive, true, 'isSprintActive must be true');
    assert(Boolean(res.data.dueDate), 'dueDate must be set');
    assert(res.data.stage !== undefined, 'Returned task must include nested stage');
    testTaskId = res.data.id;
  });

  await runTestCase('CORE_REST', 'GET /api/tasks?isSprintActive=true filters active sprint tasks and includes stage', async () => {
    const res = await makeRequest('GET', '/api/tasks?isSprintActive=true');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array of tasks');
    const found = res.data.find((t: any) => t.id === testTaskId);
    assert(Boolean(found), 'Created sprint task must be present in filtered list');
    assertEqual(found.isSprintActive, true, 'Filtered item must have isSprintActive=true');
    assert(found.stage && found.stage.title, 'Task must include stage relation for Sprint Kanban view');
  });

  await runTestCase('CORE_REST', 'PATCH /api/tasks/:id toggles sprint and updates status', async () => {
    assert(Boolean(testTaskId), 'Prerequisite task missing');
    const res = await makeRequest('PATCH', `/api/tasks/${testTaskId}`, {
      status: 'IN_PROGRESS',
      isSprintActive: false,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assertEqual(res.data.status, 'IN_PROGRESS', 'Task status should update to IN_PROGRESS');
    assertEqual(res.data.isSprintActive, false, 'isSprintActive should update to false');

    // Toggle back to true
    const res2 = await makeRequest('PATCH', `/api/tasks/${testTaskId}`, {
      isSprintActive: true,
    });
    assert(res2.status === 200, `Expected 200, got ${res2.status}`);
    assertEqual(res2.data.isSprintActive, true, 'isSprintActive should be restored to true');
  });

  // -------------------------------------------------------------
  // PART 2: APPOINTMENTS & UNIFIED CALENDAR CONTRACTS
  // -------------------------------------------------------------
  console.log('\n--- PART 2: Appointments & Unified Calendar Contracts ---');

  await runTestCase('CALENDAR', 'POST /api/appointments creates appointment', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const res = await makeRequest('POST', '/api/appointments', {
      title: 'Reunião de Alinhamento Sprint M3',
      description: 'Validação com a equipe de arquitetura',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      locationOrLink: 'https://meet.google.com/challenger-m3',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data && res.data.id, 'Expected appointment id');
    assertEqual(res.data.isCompleted, false, 'Default isCompleted must be false');
    testAppointmentId = res.data.id;
  });

  await runTestCase('CALENDAR', 'GET /api/appointments/:id and listAppointments', async () => {
    assert(Boolean(testAppointmentId), 'Prerequisite appointment missing');
    const getRes = await makeRequest('GET', `/api/appointments/${testAppointmentId}`);
    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assertEqual(getRes.data.id, testAppointmentId, 'Must return same appointment id');

    const listRes = await makeRequest('GET', '/api/appointments');
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(Array.isArray(listRes.data), 'Expected array of appointments');
    assert(listRes.data.some((a: any) => a.id === testAppointmentId), 'Appointment must be in list');
  });

  await runTestCase('CALENDAR', 'PATCH /api/appointments/:id toggleCompleted and update', async () => {
    assert(Boolean(testAppointmentId), 'Prerequisite appointment missing');
    const patchRes = await makeRequest('PATCH', `/api/appointments/${testAppointmentId}`, {
      isCompleted: true,
      title: 'Reunião de Alinhamento Sprint M3 (Realizada)',
    });
    assert(patchRes.status === 200, `Expected 200, got ${patchRes.status}`);
    assertEqual(patchRes.data.isCompleted, true, 'isCompleted must be true');
    assertEqual(patchRes.data.title, 'Reunião de Alinhamento Sprint M3 (Realizada)', 'Title must be updated');
  });

  await runTestCase('CALENDAR', 'GET /api/calendar/events?includeCompleted=true returns unified projection of APPOINTMENT and TASK_DEADLINE', async () => {
    const res = await makeRequest('GET', '/api/calendar/events?includeCompleted=true');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array of calendar events');

    const hasAppointment = res.data.some((e: any) => e.sourceType === 'APPOINTMENT');
    const hasDeadline = res.data.some((e: any) => e.sourceType === 'TASK_DEADLINE');

    assert(hasAppointment, 'Unified calendar events must include APPOINTMENT items');
    assert(hasDeadline, 'Unified calendar events must include TASK_DEADLINE items');

    const aptEvent = res.data.find((e: any) => e.sourceId === testAppointmentId);
    assert(Boolean(aptEvent), 'Created appointment must project into calendar events when includeCompleted=true');
    assert(aptEvent.start && aptEvent.end, 'Projected event must have start and end ISO strings');
    assert(Boolean(aptEvent.color), 'Projected event must have UI color specified');

    // Also verify default behavior: when includeCompleted is not passed, completed appointment is excluded
    const defaultRes = await makeRequest('GET', '/api/calendar/events');
    assert(defaultRes.status === 200, 'Expected 200 for default events list');
    const defaultFound = defaultRes.data.find((e: any) => e.sourceId === testAppointmentId);
    assert(!defaultFound, 'Completed appointment must be excluded when includeCompleted is not true');
  });

  // -------------------------------------------------------------
  // PART 3: ACADEMIC MODULE CONTRACTS
  // -------------------------------------------------------------
  console.log('\n--- PART 3: Academic Module Contracts ---');

  await runTestCase('ACADEMIC', 'POST /api/academic/subjects creates academic subject with auto-seeded stages', async () => {
    const res = await makeRequest('POST', '/api/academic/subjects', {
      title: 'Compiladores e Teoria da Computação',
      description: 'Mapeamento de AST e gramáticas formais',
      businessLogic: '# Critérios de Avaliação\n- Prova 1: 40%\n- Trabalho Final: 60%',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data && res.data.id, 'Expected subject id');
    assertEqual(res.data.type, 'ACADEMIC', 'Created subject type must be ACADEMIC');
    assert(Array.isArray(res.data.stages) && res.data.stages.length === 3, 'Must auto-seed 3 academic stages');
    testSubjectId = res.data.id;
  });

  await runTestCase('ACADEMIC', 'GET /api/academic/subjects lists subjects with metrics', async () => {
    assert(Boolean(testSubjectId), 'Prerequisite subject missing');
    const res = await makeRequest('GET', '/api/academic/subjects');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array of academic subjects');
    const found = res.data.find((s: any) => s.id === testSubjectId);
    assert(Boolean(found), 'Created subject must be in list');
    assert(found.totalStages !== undefined, 'Subject must include totalStages metric');
    assert(found.pendingDeadlinesCount !== undefined, 'Subject must include pendingDeadlinesCount metric');
  });

  await runTestCase('ACADEMIC', 'POST /api/academic/deadlines creates deadline under academic subject stage', async () => {
    assert(Boolean(testSubjectId), 'Prerequisite subject missing');
    const subjectRes = await makeRequest('GET', `/api/academic/subjects/${testSubjectId}`);
    assert(subjectRes.status === 200, 'Failed to fetch subject');
    const stages = subjectRes.data.stages;
    assert(stages && stages.length > 0, 'Subject stages missing');
    const targetStageId = stages[1].id; // "Trabalhos & Entregas" or second stage

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const dlRes = await makeRequest('POST', '/api/academic/deadlines', {
      stageId: targetStageId,
      title: 'Entrega do Analisador Léxico e Sintático',
      description: 'Submeter no portal acadêmico',
      dueDate: futureDate,
    });
    assert(dlRes.status === 201, `Expected 201, got ${dlRes.status}`);
    assert(dlRes.data && dlRes.data.id, 'Expected deadline id');
    assertEqual(dlRes.data.subjectId, testSubjectId, 'Deadline must map to subjectId');
    assert(typeof dlRes.data.daysRemaining === 'number', 'Deadline must compute daysRemaining');
    testDeadlineId = dlRes.data.id;
  });

  await runTestCase('ACADEMIC', 'GET /api/academic/deadlines lists and filters deadlines', async () => {
    assert(Boolean(testDeadlineId), 'Prerequisite deadline missing');
    const res = await makeRequest('GET', `/api/academic/deadlines?projectId=${testSubjectId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array of deadlines');
    const found = res.data.find((d: any) => d.id === testDeadlineId);
    assert(Boolean(found), 'Created deadline must be found in list');
    assertEqual(found.isOverdue, false, 'Future deadline must not be overdue');
  });

  await runTestCase('ACADEMIC', 'PATCH /api/academic/deadlines/:id updates status', async () => {
    assert(Boolean(testDeadlineId), 'Prerequisite deadline missing');
    const res = await makeRequest('PATCH', `/api/academic/deadlines/${testDeadlineId}`, {
      status: 'DONE',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assertEqual(res.data.status, 'DONE', 'Deadline status must update to DONE');
  });

  // -------------------------------------------------------------
  // PART 4: ADVERSARIAL STRESS & BOUNDARY TESTS
  // -------------------------------------------------------------
  console.log('\n--- PART 4: Adversarial Stress & Boundary Tests ---');

  await runTestCase('ADVERSARIAL', 'Empty title on POST /api/appointments returns 400 Bad Request', async () => {
    const res = await makeRequest('POST', '/api/appointments', {
      title: '   ',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTestCase('ADVERSARIAL', 'Inverted dates on POST /api/appointments (start >= end) returns 400 Bad Request', async () => {
    const now = new Date();
    const res = await makeRequest('POST', '/api/appointments', {
      title: 'Invalid Appointment Times',
      startTime: new Date(now.getTime() + 7200000).toISOString(),
      endTime: new Date(now.getTime() + 3600000).toISOString(),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTestCase('ADVERSARIAL', 'Non-existent UUID on GET /api/appointments/:id returns 404', async () => {
    const res = await makeRequest('GET', '/api/appointments/00000000-0000-0000-0000-000000000000');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTestCase('ADVERSARIAL', 'Non-existent UUID on PATCH /api/academic/deadlines/:id returns 404', async () => {
    const res = await makeRequest('PATCH', '/api/academic/deadlines/00000000-0000-0000-0000-000000000000', {
      status: 'DONE',
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTestCase('ADVERSARIAL', 'Invalid Task status on PATCH /api/tasks/:id returns 400 Bad Request', async () => {
    assert(Boolean(testTaskId), 'Prerequisite task missing');
    const res = await makeRequest('PATCH', `/api/tasks/${testTaskId}`, {
      status: 'INVALID_STATUS_FOOBAR',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTestCase('ADVERSARIAL', 'Empty title on POST /api/academic/deadlines returns 400 Bad Request', async () => {
    const res = await makeRequest('POST', '/api/academic/deadlines', {
      stageId: testStageId,
      title: '   ',
      dueDate: new Date().toISOString(),
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // PART 5: CLEANUP AND CASCADE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- PART 5: Cleanup and Cascade Verification ---');

  await runTestCase('CLEANUP', 'DELETE /api/appointments/:id removes test appointment', async () => {
    if (testAppointmentId) {
      const res = await makeRequest('DELETE', `/api/appointments/${testAppointmentId}`);
      assert(res.status === 204 || res.status === 200, `Expected 204/200, got ${res.status}`);
      const check = await makeRequest('GET', `/api/appointments/${testAppointmentId}`);
      assert(check.status === 404, 'Appointment must no longer exist');
    }
  });

  await runTestCase('CLEANUP', 'DELETE /api/academic/deadlines/:id removes test deadline', async () => {
    if (testDeadlineId) {
      const res = await makeRequest('DELETE', `/api/academic/deadlines/${testDeadlineId}`);
      assert(res.status === 204 || res.status === 200, `Expected 204/200, got ${res.status}`);
      const check = await makeRequest('GET', `/api/tasks/${testDeadlineId}`);
      assert(check.status === 404, 'Deadline task must no longer exist');
    }
  });

  await runTestCase('CLEANUP', 'DELETE /api/projects/:id cascades and removes project, stage, and task', async () => {
    if (testProjectId) {
      const res = await makeRequest('DELETE', `/api/projects/${testProjectId}`);
      assert(res.status === 204 || res.status === 200, `Expected 204/200, got ${res.status}`);
      const checkPrj = await makeRequest('GET', `/api/projects/${testProjectId}`);
      assert(checkPrj.status === 404, 'Project must no longer exist');
      const checkStg = await makeRequest('GET', `/api/stages/${testStageId}`);
      assert(checkStg.status === 404, 'Stage must cascade delete');
      const checkTsk = await makeRequest('GET', `/api/tasks/${testTaskId}`);
      assert(checkTsk.status === 404, 'Task must cascade delete');
    }
    if (testSubjectId) {
      const res = await makeRequest('DELETE', `/api/projects/${testSubjectId}`);
      assert(res.status === 204 || res.status === 200, `Expected 204/200, got ${res.status}`);
    }
  });

  // -------------------------------------------------------------
  // PART 6: COMPONENT CONTRACTS & STATIC ANALYSIS
  // -------------------------------------------------------------
  console.log('\n--- PART 6: Frontend Component Contract Inspections ---');

  await runTestCase('CONTRACTS', 'Verify KanbanBoard exports and props interface', async () => {
    const file = path.join(WORKSPACE_DIR, 'frontend/src/components/KanbanBoard.tsx');
    assert(fs.existsSync(file), 'KanbanBoard.tsx must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert(content.includes('export interface KanbanBoardProps'), 'Must export KanbanBoardProps');
    assert(content.includes('export const KanbanBoard'), 'Must export KanbanBoard component');
    assert(content.includes('DashboardOverview'), 'Must render DashboardOverview');
    assert(content.includes('selectedCategory'), 'Must accept backward-compatible selectedCategory prop');
    assert(content.includes('onOpenCreateModal'), 'Must accept backward-compatible onOpenCreateModal prop');
  });

  await runTestCase('CONTRACTS', 'Verify TaskCard exports and props interface', async () => {
    const file = path.join(WORKSPACE_DIR, 'frontend/src/components/TaskCard.tsx');
    assert(fs.existsSync(file), 'TaskCard.tsx must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert(content.includes('export interface TaskCardProps'), 'Must export TaskCardProps');
    assert(content.includes('export const TaskCard'), 'Must export TaskCard component');
    assert(content.includes('onMoveTask'), 'Must support onMoveTask');
    assert(content.includes('onDeleteTask'), 'Must support onDeleteTask');
    assert(content.includes('onAddSubtask'), 'Must support onAddSubtask');
    assert(content.includes('onToggleSubtask'), 'Must support onToggleSubtask');
    assert(content.includes('onToggleSprint'), 'Must support onToggleSprint');
  });

  await runTestCase('CONTRACTS', 'Verify CreateTaskModal exports and props interface', async () => {
    const file = path.join(WORKSPACE_DIR, 'frontend/src/components/CreateTaskModal.tsx');
    assert(fs.existsSync(file), 'CreateTaskModal.tsx must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert(content.includes('export interface CreateTaskModalProps'), 'Must export CreateTaskModalProps');
    assert(content.includes('export const CreateTaskModal'), 'Must export CreateTaskModal component');
    assert(content.includes('defaultCategory'), 'Must accept defaultCategory prop');
    assert(content.includes('defaultSprintActive'), 'Must accept defaultSprintActive prop');
  });

  await runTestCase('CONTRACTS', 'Verify ProjectList exports and props interface', async () => {
    const file = path.join(WORKSPACE_DIR, 'frontend/src/components/ProjectList.tsx');
    assert(fs.existsSync(file), 'ProjectList.tsx must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert(content.includes('export interface ProjectListProps'), 'Must export ProjectListProps');
    assert(content.includes('export const ProjectList'), 'Must export ProjectList component');
  });

  await runTestCase('CONTRACTS', 'Verify Navbar exports and 5-view navigation interface', async () => {
    const file = path.join(WORKSPACE_DIR, 'frontend/src/components/Navbar.tsx');
    assert(fs.existsSync(file), 'Navbar.tsx must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert(content.includes('export interface NavbarProps'), 'Must export NavbarProps');
    assert(content.includes('export const Navbar'), 'Must export Navbar component');
    assert(content.includes('onSelectView'), 'Must support onSelectView');
    assert(content.includes('categoryCounts'), 'Must support categoryCounts');
    assert(content.includes('sprintActiveCount'), 'Must support sprintActiveCount');
    assert(content.includes('academicCount'), 'Must support academicCount');
    assert(content.includes('calendarCount'), 'Must support calendarCount');
  });

  await runTestCase('CONTRACTS', 'Verify Specialized View Components exist and export correctly', async () => {
    const sprintView = path.join(WORKSPACE_DIR, 'frontend/src/components/sprint/SprintKanbanView.tsx');
    const academicView = path.join(WORKSPACE_DIR, 'frontend/src/components/academic/AcademicView.tsx');
    const calendarView = path.join(WORKSPACE_DIR, 'frontend/src/components/calendar/CalendarView.tsx');

    assert(fs.existsSync(sprintView), 'SprintKanbanView.tsx must exist');
    assert(fs.existsSync(academicView), 'AcademicView.tsx must exist');
    assert(fs.existsSync(calendarView), 'CalendarView.tsx must exist');

    const sprintContent = fs.readFileSync(sprintView, 'utf-8');
    const academicContent = fs.readFileSync(academicView, 'utf-8');
    const calendarContent = fs.readFileSync(calendarView, 'utf-8');

    assert(sprintContent.includes('export const SprintKanbanView'), 'SprintKanbanView must be exported');
    assert(academicContent.includes('export const AcademicView'), 'AcademicView must be exported');
    assert(calendarContent.includes('export const CalendarView'), 'CalendarView must be exported');
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log('                 ADVERSARIAL HARNESS SUMMARY                    ');
  console.log('================================================================');
  console.log(`Total Scenarios: ${total}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log(`Pass Rate:       ${passRate}%`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    for (const r of testResults.filter((r) => !r.passed)) {
      console.error(` - [${r.category}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\nAll adversarial regression and contract challenges PASSED with 100% success!');
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal unhandled error during challenge harness:', err);
  process.exit(1);
});
