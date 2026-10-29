/**
 * Adversarial Challenger M2-2: MCP Multi-User Isolation & Strict Tenant Scoping Test Suite
 *
 * Verifies the CRITICAL USER DIRECTIVE:
 * "tem que ficar atento com mcp que ele so pode pegar os dados do usuario em questão autenticado,
 *  então valide essa questão para limitar o acesso do mcp.
 *  Garantam que absolutamente NENHUMA ferramenta MCP (academic tools, calendar tools, project tools, task tools)
 *  retorne dados globais ou de outro usuário. Toda chamada MCP deve operar estritamente no escopo do userId
 *  resolvido a partir do token de autenticação. Não deve haver fallback permissivo que vaze dados do admin
 *  ou de terceiros se o token pertencer a um usuário comum, e requisições MCP devem respeitar isolamento multi-tenant rigoroso."
 */

import { prisma } from '../backend/src/prisma.js';
import { handleAcademicTools } from '../backend/src/modules/mcp/tools/academic.tools.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';
import { handleProjectTools } from '../backend/src/modules/mcp/tools/project.tools.js';
import { handleTaskTools } from '../backend/src/modules/mcp/tools/task.tools.js';
import { projectService } from '../backend/src/modules/projects/services/project.service.js';
import { stageService } from '../backend/src/modules/projects/services/stage.service.js';
import { handleStreamableHttp, streamableSessions } from '../backend/src/modules/mcp/mcp.server.js';

interface TestCheckResult {
  section: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: any;
}

const allResults: TestCheckResult[] = [];

function record(section: string, testName: string, passed: boolean, expected: string, actual: string, details?: any) {
  allResults.push({ section, testName, passed, expected, actual, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${section}] ${testName}`);
  if (!passed) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }
}

async function runAdversarialMcpTestSuite() {
  console.log('======================================================================');
  console.log('CHALLENGER M2-2: EMPIRICAL ADVERSARIAL MCP MULTI-USER ISOLATION HARNESS');
  console.log('======================================================================\n');

  const suffix = Date.now().toString().slice(-6);
  const aliceEmail = `alice_mcp_${suffix}@challenger.test`;
  const bobEmail = `bob_mcp_${suffix}@challenger.test`;
  const adminEmail = (process.env.DEFAULT_OWNER_EMAIL || 'admin@brainboard.local').toLowerCase().trim();

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash: 'dummy',
    },
  });

  // Create Alice and Bob
  const alice = await prisma.user.create({
    data: {
      email: aliceEmail,
      name: 'Alice Challenger',
      passwordHash: 'dummy',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: bobEmail,
      name: 'Bob Challenger',
      passwordHash: 'dummy',
    },
  });

  console.log(`Initialized Test Users:`);
  console.log(`- Admin: ${admin.id} (${admin.email})`);
  console.log(`- Alice: ${alice.id} (${alice.email})`);
  console.log(`- Bob:   ${bob.id} (${bob.email})\n`);

  // Setup Admin institutional baseline data to detect cross-tenant / admin leaks
  const adminSubject = await prisma.academicSubject.create({
    data: {
      title: `Admin Institutional Subject ${suffix}`,
      userId: admin.id,
    },
  });
  const adminAppointment = await prisma.appointment.create({
    data: {
      title: `Admin Secret Board Meeting ${suffix}`,
      startTime: new Date(Date.now() + 2 * 3600000),
      endTime: new Date(Date.now() + 3 * 3600000),
      userId: admin.id,
    },
  });

  try {
    // -----------------------------------------------------------------------------------
    // PART 1: ALICE DATA CREATION VIA MCP (User A)
    // -----------------------------------------------------------------------------------
    console.log('=== PART 1: User A (Alice) Data Creation via MCP ===');

    let aliceSubjectId = '';
    try {
      const res = await handleAcademicTools('create_subject', {
        title: `Alice Quantum Mechanics ${suffix}`,
        description: 'Advanced Quantum Mechanics Course',
        professor: 'Dr. Feynman',
        colorCode: '#8B5CF6',
      }, alice.id);
      const parsed = JSON.parse(res?.content[0]?.text || '{}');
      aliceSubjectId = parsed.id;
      record(
        'Part 1 - Alice Creation',
        'Alice creates academic subject via MCP (create_subject)',
        !!aliceSubjectId && parsed.subject?.userId === alice.id,
        `Subject created with owner=${alice.id}`,
        `id=${aliceSubjectId}, owner=${parsed.subject?.userId}`
      );
    } catch (err: any) {
      record('Part 1 - Alice Creation', 'Alice creates academic subject via MCP', false, 'Success', err.message);
    }

    let aliceAssignmentId = '';
    try {
      const dueDate = new Date(Date.now() + 3 * 86400000).toISOString();
      const res = await handleAcademicTools('create_assignment', {
        subjectId: aliceSubjectId,
        title: `Alice Problem Set 1 ${suffix}`,
        type: 'HOMEWORK',
        dueDate,
      }, alice.id);
      const parsed = JSON.parse(res?.content[0]?.text || '{}');
      aliceAssignmentId = parsed.id;
      record(
        'Part 1 - Alice Creation',
        'Alice creates academic assignment via MCP (create_assignment)',
        !!aliceAssignmentId && parsed.assignment?.userId === alice.id,
        `Assignment created with owner=${alice.id}`,
        `id=${aliceAssignmentId}, owner=${parsed.assignment?.userId}`
      );
    } catch (err: any) {
      record('Part 1 - Alice Creation', 'Alice creates academic assignment via MCP', false, 'Success', err.message);
    }

    let aliceAppointmentId = '';
    try {
      const startTime = new Date(Date.now() + 4 * 3600000).toISOString();
      const endTime = new Date(Date.now() + 5 * 3600000).toISOString();
      const res = await handleM2Tools('create_appointment', {
        title: `Alice Lab Session ${suffix}`,
        startTime,
        endTime,
        description: 'Spectroscopy lab',
      }, alice.id);
      const rawText = res?.content[0]?.text || '';
      const match = rawText.match(/Compromisso agendado com sucesso:\s+([a-zA-Z0-9_-]+)/);
      aliceAppointmentId = match ? match[1] : '';
      record(
        'Part 1 - Alice Creation',
        'Alice creates appointment via MCP (create_appointment)',
        !!aliceAppointmentId,
        'Appointment created and ID returned',
        rawText
      );
    } catch (err: any) {
      record('Part 1 - Alice Creation', 'Alice creates appointment via MCP', false, 'Success', err.message);
    }

    // -----------------------------------------------------------------------------------
    // PART 2: USER B (BOB) QUERY ISOLATION & CROSS-TENANT DEFENSE VIA MCP
    // -----------------------------------------------------------------------------------
    console.log('\n=== PART 2: User B (Bob) Query Isolation & Cross-Tenant Defense ===');

    // 2.1 Bob calls list_subjects
    try {
      const res = await handleAcademicTools('list_subjects', {}, bob.id);
      const subjects: any[] = JSON.parse(res?.content[0]?.text || '[]');
      const seesAliceSubject = subjects.some((s) => s.id === aliceSubjectId);
      const seesAdminSubject = subjects.some((s) => s.id === adminSubject.id);

      record(
        'Part 2 - Bob Isolation',
        'Bob list_subjects returns empty array [] (does NOT see Alice subjects)',
        subjects.length === 0,
        'Empty array []',
        `Returned ${subjects.length} subjects`
      );

      record(
        'Part 2 - Bob Isolation',
        'Bob list_subjects strictly excludes Alice subject',
        !seesAliceSubject,
        'Alice subject absent',
        seesAliceSubject ? 'BREACH: Leaked Alice subject to Bob' : 'Zero leak'
      );

      record(
        'Part 2 - Bob Isolation',
        'Bob list_subjects strictly excludes Admin subject',
        !seesAdminSubject,
        'Admin subject absent',
        seesAdminSubject ? 'BREACH: Leaked Admin subject to Bob' : 'Zero leak'
      );
    } catch (err: any) {
      record('Part 2 - Bob Isolation', 'Bob list_subjects execution', false, 'Success with empty array', err.message);
    }

    // 2.2 Bob calls list_upcoming_deadlines
    try {
      const res = await handleM2Tools('list_upcoming_deadlines', { days: 7 }, bob.id);
      const parsed = JSON.parse(res?.content[0]?.text || '{}');
      const deadlines: any[] = parsed.deadlines || [];
      const appointments: any[] = parsed.appointments || [];

      const seesAliceAppointment = appointments.some((a) => a.id === aliceAppointmentId);
      const seesAdminAppointment = appointments.some((a) => a.id === adminAppointment.id);

      record(
        'Part 2 - Bob Isolation',
        'Bob list_upcoming_deadlines returns 0 deadlines and 0 appointments',
        deadlines.length === 0 && appointments.length === 0,
        '0 deadlines and 0 appointments',
        `${deadlines.length} deadlines, ${appointments.length} appointments`
      );

      record(
        'Part 2 - Bob Isolation',
        'Bob list_upcoming_deadlines strictly excludes Alice appointment',
        !seesAliceAppointment,
        'Alice appointment absent',
        seesAliceAppointment ? 'BREACH: Leaked Alice appointment to Bob' : 'Zero leak'
      );

      record(
        'Part 2 - Bob Isolation',
        'Bob list_upcoming_deadlines strictly excludes Admin appointment',
        !seesAdminAppointment,
        'Admin appointment absent',
        seesAdminAppointment ? 'BREACH: Leaked Admin appointment to Bob' : 'Zero leak'
      );
    } catch (err: any) {
      record('Part 2 - Bob Isolation', 'Bob list_upcoming_deadlines execution', false, 'Success with 0 items', err.message);
    }

    // 2.3 Bob attempts cross-tenant assignment creation referencing Alice's subject
    try {
      await handleAcademicTools('create_assignment', {
        subjectId: aliceSubjectId,
        title: `Bob Injected Assignment ${suffix}`,
        type: 'HOMEWORK',
      }, bob.id);
      record(
        'Part 2 - Bob Isolation',
        'Bob cross-tenant assignment injection into Alice subject rejected',
        false,
        'Throws NotFoundError',
        'FAILED: Bob successfully created assignment in Alice subject!'
      );
    } catch (err: any) {
      record(
        'Part 2 - Bob Isolation',
        'Bob cross-tenant assignment injection into Alice subject rejected',
        true,
        'Throws NotFoundError',
        `Correctly rejected: [${err.name}] ${err.message}`
      );
    }

    // 2.4 Bob attempts cross-tenant assignment status mutation
    try {
      await handleAcademicTools('update_assignment_status', {
        id: aliceAssignmentId,
        status: 'DONE',
      }, bob.id);
      record(
        'Part 2 - Bob Isolation',
        'Bob updating Alice assignment status rejected',
        false,
        'Throws NotFoundError',
        'FAILED: Bob mutated Alice assignment status!'
      );
    } catch (err: any) {
      record(
        'Part 2 - Bob Isolation',
        'Bob updating Alice assignment status rejected',
        true,
        'Throws NotFoundError',
        `Correctly rejected: [${err.name}] ${err.message}`
      );
    }

    // -----------------------------------------------------------------------------------
    // PART 3: UNAUTHENTICATED / MISSING USER CONTEXT (userId = undefined)
    // CRITICAL USER DIRECTIVE:
    // "Call MCP tools without valid userId -> verify it is strictly rejected with an error,
    //  and NEVER falls back to admin or global records!"
    // "Não deve haver fallback permissivo que vaze dados do admin ou de terceiros se o token
    //  pertencer a um usuário comum, e requisições MCP devem respeitar isolamento multi-tenant rigoroso."
    // -----------------------------------------------------------------------------------
    console.log('\n=== PART 3: Unauthenticated / Missing User Context (userId = undefined) ===');
    console.log(`Current env ALLOW_ANONYMOUS_DEV: "${process.env.ALLOW_ANONYMOUS_DEV}"`);

    // 3.1 Unauthenticated list_subjects
    try {
      const res = await handleAcademicTools('list_subjects', {}, undefined);
      const text = res?.content[0]?.text || '';
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleAcademicTools(list_subjects, userId=undefined) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error("Nenhum usuário autenticado")',
        `PERMISSIVE FALLBACK BREACH: Returned HTTP/JSON result instead of throwing error! Content: ${text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (err: any) {
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleAcademicTools(list_subjects, userId=undefined) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // 3.2 Unauthenticated create_subject
    try {
      const res = await handleAcademicTools('create_subject', { title: `Unauth Subject ${suffix}` }, undefined);
      const text = res?.content[0]?.text || '';
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleAcademicTools(create_subject, userId=undefined) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error("Nenhum usuário autenticado")',
        `PERMISSIVE FALLBACK BREACH: Created subject for admin without authentication! Content: ${text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (err: any) {
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleAcademicTools(create_subject, userId=undefined) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // 3.3 Unauthenticated create_appointment
    try {
      const res = await handleM2Tools('create_appointment', {
        title: `Unauth Appointment ${suffix}`,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
      }, undefined);
      const text = res?.content[0]?.text || '';
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(create_appointment, userId=undefined) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error("Usuário não autenticado")',
        `PERMISSIVE FALLBACK BREACH: Created appointment for admin without authentication! Content: ${text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (err: any) {
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(create_appointment, userId=undefined) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // 3.4 Unauthenticated list_upcoming_deadlines
    try {
      const res = await handleM2Tools('list_upcoming_deadlines', { days: 7 }, undefined);
      const parsed = JSON.parse(res?.content[0]?.text || '{}');
      const apts: any[] = parsed.appointments || [];
      const leakedAdminApt = apts.some((a) => a.id === adminAppointment.id);

      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(list_upcoming_deadlines, userId=undefined) MUST NOT leak Admin appointments',
        !leakedAdminApt,
        'Admin appointments not present',
        leakedAdminApt ? `LEAKED Admin appointment ${adminAppointment.id} to unauthenticated caller!` : 'Zero admin leak'
      );

      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(list_upcoming_deadlines, userId=undefined) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error',
        `Did not throw error: returned status 200 with ${apts.length} appointments`
      );
    } catch (err: any) {
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(list_upcoming_deadlines, userId=undefined) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // 3.5 Unauthenticated add_to_sprint
    try {
      const res = await handleM2Tools('add_to_sprint', { taskId: 'any-id', isSprintActive: true }, undefined);
      const text = res?.content[0]?.text || '';
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(add_to_sprint, userId=undefined) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error("Usuário não autenticado")',
        `PERMISSIVE FALLBACK BREACH: Allowed add_to_sprint without authentication! Content: ${text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (err: any) {
      record(
        'Part 3 - Unauthenticated Rejection',
        'handleM2Tools(add_to_sprint, userId=undefined) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // -----------------------------------------------------------------------------------
    // PART 4: PROJECT & TASK MCP TOOLS AUDIT
    // Directive: "Garantam que absolutamente NENHUMA ferramenta MCP (academic tools, calendar tools, project tools, task tools) retorne dados globais ou de outro usuário."
    // -----------------------------------------------------------------------------------
    console.log('\n=== PART 4: Project & Task Tools Multi-User & Unauthenticated Audit ===');

    let aliceProjectId = '';
    let aliceStageId = '';
    try {
      const proj = await projectService.createProject({
        title: `Alice Confidential Project ${suffix}`,
        description: 'Proprietary IP',
        ownerId: alice.id,
      });
      aliceProjectId = proj.id;

      const stage = await stageService.createStage({
        projectId: aliceProjectId,
        title: 'Alice Private Stage',
      });
      aliceStageId = stage.id;
    } catch (err: any) {
      console.error('Failed to setup Alice project for Part 4:', err);
    }

    // 4.1 Bob calls list_projects
    try {
      const res = await handleProjectTools('list_projects', {}, bob.id);
      const projects: any[] = JSON.parse(res?.content[0]?.text || '[]');
      const seesAliceProject = projects.some((p) => p.id === aliceProjectId);
      record(
        'Part 4 - Project/Task Tools',
        'Bob handleProjectTools(list_projects) does NOT see Alice project',
        !seesAliceProject,
        'Alice project absent',
        seesAliceProject ? `LEAKED Alice project ${aliceProjectId} to Bob!` : 'Zero leak'
      );
    } catch (err: any) {
      record('Part 4 - Project/Task Tools', 'Bob list_projects', false, 'Success', err.message);
    }

    // 4.2 Unauthenticated caller calls list_projects
    try {
      const res = await handleProjectTools('list_projects', {}, undefined);
      const projects: any[] = JSON.parse(res?.content[0]?.text || '[]');
      const seesAliceProject = projects.some((p) => p.id === aliceProjectId);

      record(
        'Part 4 - Project/Task Tools',
        'Unauthenticated handleProjectTools(list_projects) MUST NOT return Alice project (Global Leak)',
        !seesAliceProject,
        'Alice project absent',
        seesAliceProject ? `GLOBAL LEAK: Unauthenticated list_projects returned Alice project ${aliceProjectId}! Returned ${projects.length} total projects across system!` : 'Zero leak'
      );

      record(
        'Part 4 - Project/Task Tools',
        'Unauthenticated handleProjectTools(list_projects) MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error',
        `Did not throw error: returned ${projects.length} projects`
      );
    } catch (err: any) {
      record(
        'Part 4 - Project/Task Tools',
        'Unauthenticated handleProjectTools(list_projects) MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // 4.3 Bob attempts to create a task in Alice's stage
    try {
      await handleTaskTools('create_task', {
        stageId: aliceStageId,
        title: `Bob Malicious Task ${suffix}`,
      }, bob.id);
      record(
        'Part 4 - Project/Task Tools',
        'Bob creating task in Alice stage MUST BE REJECTED',
        false,
        'Throws Error(Acesso negado)',
        'FAILED: Bob created a task in Alice project!'
      );
    } catch (err: any) {
      record(
        'Part 4 - Project/Task Tools',
        'Bob creating task in Alice stage MUST BE REJECTED',
        true,
        'Throws Error(Acesso negado)',
        `Correctly rejected: ${err.message}`
      );
    }

    // 4.4 Unauthenticated caller attempts to create a task in Alice's stage
    try {
      const res = await handleTaskTools('create_task', {
        stageId: aliceStageId,
        title: `Unauthenticated Injected Task ${suffix}`,
      }, undefined);
      const text = res?.content[0]?.text || '';
      record(
        'Part 4 - Project/Task Tools',
        'Unauthenticated creating task in Alice stage MUST BE REJECTED WITH ERROR',
        false,
        'Throws Error',
        `SECURITY BREACH: Unauthenticated caller bypassed access control and injected task into Alice stage! Result: ${text.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    } catch (err: any) {
      record(
        'Part 4 - Project/Task Tools',
        'Unauthenticated creating task in Alice stage MUST BE REJECTED WITH ERROR',
        true,
        'Throws Error',
        `Correctly rejected: ${err.message}`
      );
    }

    // -----------------------------------------------------------------------------------
    // PART 5: BEHAVIOR UNDER ALLOW_ANONYMOUS_DEV = 'false'
    // -----------------------------------------------------------------------------------
    console.log('\n=== PART 5: Testing Under ALLOW_ANONYMOUS_DEV = "false" ===');
    const origEnv = process.env.ALLOW_ANONYMOUS_DEV;
    process.env.ALLOW_ANONYMOUS_DEV = 'false';

    try {
      // 5.1 Unauthenticated list_subjects under ALLOW_ANONYMOUS_DEV=false
      try {
        await handleAcademicTools('list_subjects', {}, undefined);
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_subjects without userId is rejected',
          false,
          'Throws Error',
          'Did not throw error'
        );
      } catch (err: any) {
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_subjects without userId is rejected',
          true,
          'Throws Error',
          `Correctly rejected: ${err.message}`
        );
      }

      // 5.2 Unauthenticated list_upcoming_deadlines under ALLOW_ANONYMOUS_DEV=false
      try {
        const res = await handleM2Tools('list_upcoming_deadlines', {}, undefined);
        const parsed = JSON.parse(res?.content[0]?.text || '{}');
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_upcoming_deadlines without userId MUST BE REJECTED WITH ERROR',
          false,
          'Throws Error',
          `Did not throw error: returned status 200 with ${parsed.totalUpcoming} upcoming items`
        );
      } catch (err: any) {
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_upcoming_deadlines without userId MUST BE REJECTED WITH ERROR',
          true,
          'Throws Error',
          `Correctly rejected: ${err.message}`
        );
      }

      // 5.3 Unauthenticated list_projects under ALLOW_ANONYMOUS_DEV=false
      try {
        const res = await handleProjectTools('list_projects', {}, undefined);
        const projects: any[] = JSON.parse(res?.content[0]?.text || '[]');
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_projects without userId MUST BE REJECTED WITH ERROR',
          false,
          'Throws Error',
          `GLOBAL LEAK PERSISTS: Returned ${projects.length} projects without throwing error`
        );
      } catch (err: any) {
        record(
          'Part 5 - Strict Env Check',
          'With ALLOW_ANONYMOUS_DEV=false: list_projects without userId MUST BE REJECTED WITH ERROR',
          true,
          'Throws Error',
          `Correctly rejected: ${err.message}`
        );
      }
    } finally {
      process.env.ALLOW_ANONYMOUS_DEV = origEnv;
    }

    // -----------------------------------------------------------------------------------
    // PART 6: STREAMABLE HTTP TRANSPORT SESSION ISOLATION
    // Directive: "Bob connecting with valid JWT cannot hijack Alice's mcp-session-id"
    // -----------------------------------------------------------------------------------
    console.log('\n=== PART 6: Streamable HTTP Transport Session Isolation ===');
    const aliceSessionId = `alice-session-${suffix}`;
    streamableSessions.set(aliceSessionId, {
      transport: {} as any,
      server: {} as any,
      userId: alice.id,
    });

    try {
      let hijackedStatus = 0;
      let hijackedBody: any = null;

      const mockReqBob: any = {
        headers: { 'mcp-session-id': aliceSessionId },
        query: {},
        user: { id: bob.id, name: 'Bob', email: bobEmail },
      };
      const mockResBob: any = {
        status: (code: number) => {
          hijackedStatus = code;
          return {
            json: (payload: any) => {
              hijackedBody = payload;
            },
          };
        },
      };

      await handleStreamableHttp(mockReqBob, mockResBob);

      record(
        'Part 6 - Transport Session Isolation',
        'Bob accessing Alice streamable session MUST BE REJECTED WITH HTTP 403',
        hijackedStatus === 403 && String(hijackedBody?.error || '').includes('pertence a outro usuário'),
        'HTTP 403 Forbidden',
        `Status ${hijackedStatus}, body: ${JSON.stringify(hijackedBody)}`
      );
    } finally {
      streamableSessions.delete(aliceSessionId);
    }

    // 6.2 Unauthenticated streamable HTTP request without user
    let unauthStatus = 0;
    let unauthBody: any = null;
    const mockReqUnauth: any = {
      headers: {},
      query: {},
      user: undefined,
    };
    const mockResUnauth: any = {
      status: (code: number) => {
        unauthStatus = code;
        return {
          json: (payload: any) => {
            unauthBody = payload;
          },
        };
      },
    };
    await handleStreamableHttp(mockReqUnauth, mockResUnauth);
    record(
      'Part 6 - Transport Session Isolation',
      'Unauthenticated handleStreamableHttp MUST BE REJECTED WITH HTTP 401',
      unauthStatus === 401,
      'HTTP 401 Unauthorized',
      `Status ${unauthStatus}, body: ${JSON.stringify(unauthBody)}`
    );

  } finally {
    // Cleanup
    console.log('\nPerforming database cleanup...');
    try {
      await prisma.academicAssignment.deleteMany({
        where: {
          OR: [
            { userId: alice.id },
            { userId: bob.id },
            { subject: { userId: alice.id } },
          ],
        },
      });
      await prisma.academicSubject.deleteMany({
        where: {
          OR: [
            { userId: alice.id },
            { userId: bob.id },
            { id: adminSubject.id },
          ],
        },
      });
      await prisma.appointment.deleteMany({
        where: {
          OR: [
            { userId: alice.id },
            { userId: bob.id },
            { id: adminAppointment.id },
          ],
        },
      });
      await prisma.task.deleteMany({
        where: {
          stage: {
            project: {
              ownerId: alice.id,
            },
          },
        },
      });
      await prisma.stage.deleteMany({
        where: {
          project: {
            ownerId: alice.id,
          },
        },
      });
      await prisma.project.deleteMany({
        where: {
          ownerId: alice.id,
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [alice.id, bob.id] },
        },
      });
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr);
    }
  }

  // Final Summary
  console.log('\n======================================================================');
  console.log('CHALLENGER EMPIRICAL VERIFICATION REPORT');
  console.log('======================================================================');
  const total = allResults.length;
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  console.log(`Total Invocations Tested: ${total}`);
  console.log(`Passed Assertions:        ${passed}`);
  console.log(`Failed Assertions:        ${failed}`);
  console.log('----------------------------------------------------------------------');

  for (const r of allResults) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${r.section}] ${r.testName}`);
  }

  console.log('======================================================================\n');
  return { total, passed, failed };
}

runAdversarialMcpTestSuite()
  .then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('FATAL TEST RUNNER ERROR:', err);
    process.exit(2);
  });
