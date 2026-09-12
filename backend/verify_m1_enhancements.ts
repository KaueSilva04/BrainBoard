import { taskService } from './src/services/task.service.js';
import { subtaskService } from './src/services/subtask.service.js';
import { createMcpServer } from './src/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function verifyM1() {
  console.log('--- Testing M1 Backend Enhancements ---');

  // 1. Test TaskService & SubtaskService
  console.log('1. Testing TaskService creation & query...');
  const task = await taskService.createTask({
    title: 'M1 Architecture Test Task',
    category: 'PROJECT',
    description: 'Testing service layer architecture',
  });
  console.log('   Created task ID:', task.id);

  const fetched = await taskService.getTaskById(task.id);
  if (!fetched || fetched.title !== 'M1 Architecture Test Task') {
    throw new Error('TaskService.getTaskById failed');
  }

  console.log('2. Testing SubtaskService creation & toggle...');
  const subtask = await subtaskService.createSubtask(task.id, 'Subtask for M1 Test');
  console.log('   Created subtask ID:', subtask.id);

  const toggled = await subtaskService.toggleSubtask(subtask.id, true);
  if (!toggled.isDone) {
    throw new Error('SubtaskService.toggleSubtask failed');
  }

  // 3. Test MCP Extended Tools via CallToolRequestSchema
  console.log('3. Testing MCP extended tools (get_task, update_task, delete_subtask, delete_task)...');
  const mcp = createMcpServer();
  
  // @ts-ignore - access handler
  const handler = mcp._requestHandlers.get(CallToolRequestSchema.shape.method.value);
  if (!handler) {
    throw new Error('MCP CallTool handler not registered');
  }

  // get_task
  const getRes = await handler({
    method: 'tools/call',
    params: {
      name: 'get_task',
      arguments: { id: task.id }
    }
  });
  const parsed = JSON.parse(getRes.content[0].text);
  if (parsed.id !== task.id) {
    throw new Error('MCP get_task returned incorrect task');
  }
  console.log('   MCP get_task passed');

  // update_task
  const updateRes = await handler({
    method: 'tools/call',
    params: {
      name: 'update_task',
      arguments: { id: task.id, title: 'Updated M1 Title' }
    }
  });
  if (!updateRes.content[0].text.includes('atualizada com sucesso')) {
    throw new Error('MCP update_task failed');
  }
  console.log('   MCP update_task passed');

  // delete_subtask
  const delSubRes = await handler({
    method: 'tools/call',
    params: {
      name: 'delete_subtask',
      arguments: { id: subtask.id }
    }
  });
  if (!delSubRes.content[0].text.includes('excluída com sucesso')) {
    throw new Error('MCP delete_subtask failed');
  }
  console.log('   MCP delete_subtask passed');

  // delete_task
  const delTaskRes = await handler({
    method: 'tools/call',
    params: {
      name: 'delete_task',
      arguments: { id: task.id }
    }
  });
  if (!delTaskRes.content[0].text.includes('excluída com sucesso')) {
    throw new Error('MCP delete_task failed');
  }
  console.log('   MCP delete_task passed');

  // 4. Test validation in TaskService
  console.log('4. Testing validation rules...');
  let validationCaught = false;
  try {
    await taskService.createTask({ title: '', category: 'PROJECT' });
  } catch (err: any) {
    validationCaught = true;
  }
  if (!validationCaught) throw new Error('Empty title validation failed');

  let invalidCatCaught = false;
  try {
    await taskService.listTasks({ category: 'NON_EXISTENT' });
  } catch (err: any) {
    invalidCatCaught = true;
  }
  if (!invalidCatCaught) throw new Error('Invalid category validation failed');

  console.log('\n========================================================');
  console.log('✅ ALL M1 ARCHITECTURAL ENHANCEMENTS VERIFIED WITH SUCCESS!');
  console.log('========================================================');
}

verifyM1()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('M1 Verification failed:', err);
    process.exit(1);
  });
