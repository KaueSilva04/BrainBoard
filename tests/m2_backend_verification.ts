/**
 * M2 Backend Verification Suite
 * Verifies all new endpoints and MCP tools introduced in Milestone 2:
 * - Academic module (/api/academic/subjects, /api/academic/deadlines)
 * - Calendar module (/api/appointments, /api/calendar/events)
 * - New MCP Tools (create_appointment, list_upcoming_deadlines, add_to_sprint)
 */

import http from 'http';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function request(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 0, data });
          } catch {
            resolve({ status: res.statusCode || 0, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- Starting Milestone 2 Backend Verification Suite ---');

  // 1. Academic Subjects
  console.log('1. Testing POST /api/academic/subjects...');
  const subRes = await request('POST', '/api/academic/subjects', {
    title: 'Engenharia de Software III',
    description: 'Curso avançado de arquitetura e DDD',
    businessLogic: '## Ementa\n- Microsserviços e Monolitos Modulares',
  });
  if (subRes.status !== 201) throw new Error(`Subject creation failed: ${subRes.status}`);
  const subjectId = subRes.data.id;
  console.log(`  ✓ Academic subject created: ${subjectId} (${subRes.data.title})`);
  if (subRes.data.stages.length !== 3) {
    throw new Error(`Expected 3 auto-seeded stages, got ${subRes.data.stages.length}`);
  }
  console.log(`  ✓ Auto-seeded stages: ${subRes.data.stages.map((s: any) => s.title).join(', ')}`);

  const deliveryStage = subRes.data.stages.find((s: any) => s.title === 'Trabalhos & Entregas');
  if (!deliveryStage) throw new Error('Stage "Trabalhos & Entregas" not found');

  // 2. Academic Deadlines
  console.log('2. Testing POST /api/academic/deadlines...');
  const futureDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const dlRes = await request('POST', '/api/academic/deadlines', {
    stageId: deliveryStage.id,
    title: 'Entrega do Projeto Final Modular',
    description: 'Enviar zip e link do repositório',
    dueDate: futureDueDate,
  });
  if (dlRes.status !== 201) throw new Error(`Deadline creation failed: ${dlRes.status}`);
  const deadlineId = dlRes.data.id;
  console.log(`  ✓ Academic deadline created: ${deadlineId}`);
  if (dlRes.data.daysRemaining !== 5) {
    console.log(`  Notice: daysRemaining is ${dlRes.data.daysRemaining}`);
  }

  // 3. List Deadlines
  console.log('3. Testing GET /api/academic/deadlines...');
  const listDl = await request('GET', `/api/academic/deadlines?projectId=${subjectId}`);
  if (listDl.status !== 200 || !listDl.data.some((d: any) => d.id === deadlineId)) {
    throw new Error('Deadline not found in list');
  }
  console.log(`  ✓ Listed deadlines: ${listDl.data.length} found`);

  // 4. Appointments CRUD
  console.log('4. Testing POST /api/appointments...');
  const aptStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const aptEnd = new Date(aptStart.getTime() + 60 * 60 * 1000);
  const aptRes = await request('POST', '/api/appointments', {
    title: 'Alinhamento Arquitetural M2',
    description: 'Revisão das especificações de calendário e MCP',
    startTime: aptStart.toISOString(),
    endTime: aptEnd.toISOString(),
    locationOrLink: 'https://meet.google.com/brainboard-m2',
  });
  if (aptRes.status !== 201) throw new Error(`Appointment creation failed: ${aptRes.status}`);
  const appointmentId = aptRes.data.id;
  console.log(`  ✓ Appointment created: ${appointmentId}`);

  // 5. Update Appointment
  console.log('5. Testing PATCH /api/appointments/:id...');
  const patchApt = await request('PATCH', `/api/appointments/${appointmentId}`, {
    description: 'Revisão atualizada com time de arquitetura',
  });
  if (patchApt.status !== 200) throw new Error(`Appointment update failed: ${patchApt.status}`);
  console.log('  ✓ Appointment updated successfully');

  // 6. Unified Calendar Events Projection
  console.log('6. Testing GET /api/calendar/events...');
  const calRes = await request('GET', '/api/calendar/events');
  if (calRes.status !== 200) throw new Error(`Calendar events failed: ${calRes.status}`);
  const hasApt = calRes.data.some((e: any) => e.sourceId === appointmentId && e.sourceType === 'APPOINTMENT');
  const hasDl = calRes.data.some((e: any) => e.sourceId === deadlineId && e.sourceType === 'TASK_DEADLINE');
  if (!hasApt || !hasDl) {
    throw new Error(`Unified projection missing events! hasApt=${hasApt}, hasDl=${hasDl}`);
  }
  console.log(`  ✓ Unified calendar returned ${calRes.data.length} events containing both APPOINTMENT and TASK_DEADLINE`);

  // 7. MCP Tools Verification (Direct execution via server)
  console.log('7. Testing MCP Tools in modules/mcp/mcp.server.js...');
  const { createMcpServer } = await import('../backend/dist/modules/mcp/mcp.server.js');
  const server = createMcpServer();
  // List tools
  const toolsHandler = (server as any)._requestHandlers.get('tools/list');
  const toolsResult = await toolsHandler({ method: 'tools/list', params: {} });
  if (toolsResult.tools.length !== 18) {
    throw new Error(`Expected 18 tools, got ${toolsResult.tools.length}`);
  }
  console.log(`  ✓ MCP registered all ${toolsResult.tools.length} tools`);

  // Call create_appointment tool
  const callHandler = (server as any)._requestHandlers.get('tools/call');
  const mcpAptRes = await callHandler({
    method: 'tools/call',
    params: {
      name: 'create_appointment',
      arguments: {
        title: 'MCP Scheduled Meeting',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      },
    },
  });
  console.log(`  ✓ MCP create_appointment: ${mcpAptRes.content[0].text}`);

  // Call add_to_sprint tool
  const mcpSprintRes = await callHandler({
    method: 'tools/call',
    params: {
      name: 'add_to_sprint',
      arguments: {
        taskId: deadlineId,
        isSprintActive: true,
      },
    },
  });
  console.log(`  ✓ MCP add_to_sprint: ${mcpSprintRes.content[0].text}`);

  // Call list_upcoming_deadlines tool
  const mcpDeadlinesRes = await callHandler({
    method: 'tools/call',
    params: {
      name: 'list_upcoming_deadlines',
      arguments: {
        days: 14,
      },
    },
  });
  const parsedDl = JSON.parse(mcpDeadlinesRes.content[0].text);
  console.log(`  ✓ MCP list_upcoming_deadlines found ${parsedDl.totalUpcoming} upcoming items`);

  // 8. Cleanup
  console.log('8. Cleaning up test fixtures...');
  await request('DELETE', `/api/appointments/${appointmentId}`);
  await request('DELETE', `/api/projects/${subjectId}`);
  console.log('  ✓ Cleaned up test appointment and subject');

  console.log('\n====================================================');
  console.log('All Milestone 2 backend verifications PASSED 100%!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
