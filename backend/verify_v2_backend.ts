import 'dotenv/config';
import assert from 'node:assert/strict';
import {
  prisma,
  projectService,
  stageService,
  updateLogService,
  memberService,
  taskService,
  subtaskService,
  createMcpServer,
} from './src/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

async function runSmokeTests() {
  console.log('--- Starting BrainBoard V2 Smoke Tests ---');

  // 1. MCP Tools Listing Test
  console.log('Testing MCP Tools Registration...');
  const mcp = createMcpServer();
  // @ts-ignore
  const listToolsHandler = mcp._requestHandlers?.get(ListToolsRequestSchema.shape.method.value);
  assert(listToolsHandler, 'ListTools handler must be registered');
  const toolsResult = await listToolsHandler({ method: 'tools/list', params: {} });
  const toolNames = toolsResult.tools.map((t: any) => t.name);
  console.log('Registered MCP Tools:', toolNames);

  const requiredTools = [
    'read_project_context',
    'update_business_logic',
    'update_project_settings',
    'log_project_update',
    'create_task',
    'add_task',
    'move_task',
    'update_task_status',
    'add_subtask',
    'toggle_subtask',
    'update_task',
    'delete_task',
    'delete_subtask',
    'list_tasks',
    'get_task',
  ];

  for (const tool of requiredTools) {
    assert(toolNames.includes(tool), `Expected tool ${tool} to be registered in MCP server`);
  }
  console.log('✓ All 15 MCP tools registered successfully.');

  // @ts-ignore
  const callToolHandler = mcp._requestHandlers?.get(CallToolRequestSchema.shape.method.value);
  assert(callToolHandler, 'CallTool handler must be registered');

  // 2. Project Creation via Service
  console.log('Testing Project Creation...');
  const project = await projectService.createProject({
    title: 'BrainBoard V2 Core Platform',
    description: 'Autonomous Project Management with MCP AI Integration',
    businessLogic: '# Core Architecture\n\n- Hierarchical project structure\n- Realtime MCP tools',
    status: 'ACTIVE',
    githubRepo: 'https://github.com/focus-task/brainboard',
    settings: {
      framework: 'express',
      database: 'neon-postgresql',
      aiModel: 'claude-3-5-sonnet',
    },
  });
  assert(project.id, 'Project ID must exist');
  assert.equal(project.title, 'BrainBoard V2 Core Platform');
  assert.equal(project.status, 'ACTIVE');
  assert.equal(project.githubRepo, 'https://github.com/focus-task/brainboard');
  console.log(`✓ Project created: ${project.id}`);

  // 3. Stage Creation via Service
  console.log('Testing Stage Creation & Auto-Order...');
  const stage1 = await stageService.createStage({
    projectId: project.id,
    title: 'Phase 1: Backend Architecture',
    status: 'IN_PROGRESS',
  });
  assert.equal(stage1.order, 0, 'First stage order should be 0');

  const stage2 = await stageService.createStage({
    projectId: project.id,
    title: 'Phase 2: MCP Integrations',
    status: 'PLANNING',
  });
  assert.equal(stage2.order, 1, 'Second stage order should auto-increment to 1');
  console.log(`✓ Stages created: ${stage1.id} (order ${stage1.order}), ${stage2.id} (order ${stage2.order})`);

  // 4. Team Member Creation
  console.log('Testing Member Creation...');
  const member = await memberService.createMember({
    projectId: project.id,
    name: 'Alice Turing',
    role: 'Lead AI Engineer',
    email: 'alice@example.com',
  });
  assert(member.id, 'Member ID must exist');
  assert.equal(member.email, 'alice@example.com');
  console.log(`✓ Member created: ${member.id} (${member.name})`);

  // 5. Update Log Creation
  console.log('Testing UpdateLog Creation...');
  const log = await updateLogService.createLog({
    projectId: project.id,
    title: 'Milestone 1 Backend Migration Complete',
    content: '### Migration Summary\n\nAll Prisma schemas, services, and MCP tools were verified.',
    author: 'Worker V2',
  });
  assert(log.id, 'Log ID must exist');
  assert.equal(log.author, 'Worker V2');
  console.log(`✓ UpdateLog created: ${log.id}`);

  // 6. Task & Subtask Creation
  console.log('Testing Task & Subtask Operations...');
  const task = await taskService.createTask({
    stageId: stage1.id,
    title: 'Refactor Prisma Schema',
    description: 'Implement Project, Stage, UpdateLog, Member hierarchies',
    status: 'IN_PROGRESS',
  });
  assert(task.id, 'Task ID must exist');
  assert.equal(task.stageId, stage1.id);

  const subtask = await subtaskService.createSubtask(task.id, 'Run prisma db push');
  assert(subtask.id, 'Subtask ID must exist');
  assert.equal(subtask.isDone, false);

  const toggledSubtask = await subtaskService.toggleSubtask(subtask.id, true);
  assert.equal(toggledSubtask.isDone, true);
  console.log(`✓ Task ${task.id} and Subtask ${subtask.id} verified.`);

  // 7. MCP Tools Invocations
  console.log('Testing MCP Tool Invocations...');

  // 7.1 read_project_context
  const contextCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'read_project_context',
      arguments: { projectId: project.id },
    },
  });
  assert(!contextCall.isError, 'read_project_context should succeed');
  const projectContext = JSON.parse(contextCall.content[0].text);
  assert.equal(projectContext.id, project.id);
  assert.equal(projectContext.stages.length, 2);
  assert.equal(projectContext.members.length, 1);
  assert.equal(projectContext.updateLogs.length, 1);
  console.log('✓ read_project_context returned full project graph');

  // 7.2 update_business_logic
  const businessLogicCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'update_business_logic',
      arguments: {
        projectId: project.id,
        businessLogic: '# Updated Architecture Specification\n\n- Verified by Worker V2',
      },
    },
  });
  assert(!businessLogicCall.isError);
  console.log('✓ update_business_logic succeeded');

  // 7.3 update_project_settings
  const settingsCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'update_project_settings',
      arguments: {
        projectId: project.id,
        githubRepo: 'https://github.com/focus-task/brainboard-updated',
        settings: { deployUrl: 'https://brainboard.dev' },
      },
    },
  });
  assert(!settingsCall.isError);
  console.log('✓ update_project_settings succeeded');

  // 7.4 log_project_update
  const logUpdateCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'log_project_update',
      arguments: {
        projectId: project.id,
        title: 'MCP AI Log Entry',
        content: 'Log submitted directly through AI tool call.',
        author: 'Claude 3.5 Sonnet',
      },
    },
  });
  assert(!logUpdateCall.isError);
  console.log('✓ log_project_update succeeded');

  // 7.5 create_task & add_task
  const createTaskCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'create_task',
      arguments: {
        stageId: stage2.id,
        title: 'Test MCP Task via create_task',
      },
    },
  });
  assert(!createTaskCall.isError);

  const addTaskCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'add_task',
      arguments: {
        stageId: stage2.id,
        title: 'Test MCP Task via add_task alias',
      },
    },
  });
  assert(!addTaskCall.isError);
  console.log('✓ create_task and add_task succeeded');

  // 7.6 move_task & update_task_status
  const moveTaskCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'move_task',
      arguments: {
        id: task.id,
        status: 'DONE',
      },
    },
  });
  assert(!moveTaskCall.isError);

  const updateTaskStatusCall = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'update_task_status',
      arguments: {
        id: task.id,
        status: 'IN_PROGRESS',
      },
    },
  });
  assert(!updateTaskStatusCall.isError);
  console.log('✓ move_task and update_task_status succeeded');

  // 8. REST HTTP API Smoke Tests
  console.log('Testing REST HTTP Endpoints...');
  const baseUrl = 'http://localhost:3000';

  // 8.1 Health check
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  console.log('✓ GET /api/health passed');

  // 8.2 GET /api/projects
  const projectsRes = await fetch(`${baseUrl}/api/projects`);
  assert.equal(projectsRes.status, 200);
  const projectsData = await projectsRes.json();
  assert(Array.isArray(projectsData));
  assert(projectsData.some((p: any) => p.id === project.id));
  console.log('✓ GET /api/projects passed');

  // 8.3 GET /api/projects/:id
  const getProjectRes = await fetch(`${baseUrl}/api/projects/${project.id}`);
  assert.equal(getProjectRes.status, 200);
  const fetchedProject = await getProjectRes.json();
  assert.equal(fetchedProject.id, project.id);
  console.log('✓ GET /api/projects/:id passed');

  // 8.4 POST /api/projects/:id/stages
  const newStageRes = await fetch(`${baseUrl}/api/projects/${project.id}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Phase 3: Testing via REST' }),
  });
  assert.equal(newStageRes.status, 201);
  const createdStage = await newStageRes.json();
  assert(createdStage.id);
  console.log('✓ POST /api/projects/:id/stages passed');

  // 8.5 POST /api/tasks
  const newTaskRes = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stageId: createdStage.id,
      title: 'REST Created Task',
      description: 'Created through Express REST API',
    }),
  });
  assert.equal(newTaskRes.status, 201);
  const createdTask = await newTaskRes.json();
  assert(createdTask.id);
  console.log('✓ POST /api/tasks passed');

  // 8.6 PATCH /api/tasks/:id/status
  const patchTaskRes = await fetch(`${baseUrl}/api/tasks/${createdTask.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'DONE' }),
  });
  assert.equal(patchTaskRes.status, 200);
  const patchedTask = await patchTaskRes.json();
  assert.equal(patchedTask.status, 'DONE');
  console.log('✓ PATCH /api/tasks/:id/status passed');

  // 9. Cascade Deletion Integrity Test
  console.log('Testing Cascade Deletion...');
  await projectService.deleteProject(project.id);

  const stagesRemaining = await prisma.stage.count({ where: { projectId: project.id } });
  const tasksRemaining = await prisma.task.count({ where: { stageId: stage1.id } });
  const subtasksRemaining = await prisma.subtask.count({ where: { taskId: task.id } });
  const logsRemaining = await prisma.updateLog.count({ where: { projectId: project.id } });
  const membersRemaining = await prisma.member.count({ where: { projectId: project.id } });

  assert.equal(stagesRemaining, 0, 'Stages should be cascade-deleted');
  assert.equal(tasksRemaining, 0, 'Tasks should be cascade-deleted');
  assert.equal(subtasksRemaining, 0, 'Subtasks should be cascade-deleted');
  assert.equal(logsRemaining, 0, 'UpdateLogs should be cascade-deleted');
  assert.equal(membersRemaining, 0, 'Members should be cascade-deleted');
  console.log('✓ Cascade deletion completely clean: all children deleted.');

  console.log('--- ALL SMOKE TESTS PASSED SUCCESSFULLY ---');
}

runSmokeTests()
  .then(() => {
    console.log('Verification run successfully finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Smoke test failed:', err);
    process.exit(1);
  });
