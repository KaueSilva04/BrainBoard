import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTextEncoding } from '../backend/src/modules/shared/text-encoding.js';
import { ValidationError } from '../backend/src/modules/shared/errors.js';
import { projectService } from '../backend/src/modules/projects/services/project.service.js';
import { stageService } from '../backend/src/modules/projects/services/stage.service.js';
import { taskService } from '../backend/src/modules/projects/services/task.service.js';
import { subtaskService } from '../backend/src/modules/projects/services/subtask.service.js';
import { prisma } from '../backend/src/prisma.js';

test('preserves Brazilian accents, composed accents, symbols and emoji', () => {
  const text = 'Ação, quitação, João, São Paulo, € R$ @ # & ç ã õ á ê — ✅ cafe\u0301';
  const fields = { title: text, description: text, empty: '', optional: undefined, nullable: null };
  validateTextEncoding(fields);
  assert.equal(fields.title, text);
  assert.equal(JSON.parse(Buffer.from(JSON.stringify(fields), 'utf8').toString('utf8')).title, text);
});

test('rejects damaged text with an actionable UTF-8 validation error', () => {
  assert.throws(() => validateTextEncoding({ title: 'N\uFFFDvel 1' }),
    (error) => error instanceof ValidationError && error.message.includes('UTF-8'));
});

test('REST and MCP shared services reject corruption before database access', async () => {
  const title = 'Notifica\uFFFD\uFFFDes';
  await assert.rejects(projectService.createProject({ title }), ValidationError);
  await assert.rejects(projectService.updateProject('unused', { description: title }), ValidationError);
  await assert.rejects(projectService.updateBusinessLogic('unused', title), ValidationError);
  await assert.rejects(stageService.createStage({ projectId: 'unused', title }), ValidationError);
  await assert.rejects(stageService.updateStage('unused', { title }), ValidationError);
  await assert.rejects(taskService.createTask({ stageId: 'unused', title }), ValidationError);
  await assert.rejects(taskService.updateTask('unused', { title }), ValidationError);
  await assert.rejects(subtaskService.createSubtask('unused', title), ValidationError);
  await assert.rejects(subtaskService.updateSubtask('unused', { title }), ValidationError);
});

test('editing a subtask title preserves its completion; legacy toggle still toggles', async () => {
  const findUnique = prisma.subtask.findUnique;
  const update = prisma.subtask.update;
  let current = { id: 'subtask', taskId: 'task', title: 'Nível 1', isDone: true, createdAt: new Date() };
  prisma.subtask.findUnique = (async () => current) as typeof findUnique;
  prisma.subtask.update = (async ({ data }: any) => {
    current = { ...current, ...data };
    return current;
  }) as typeof update;
  try {
    assert.equal((await subtaskService.updateSubtask('subtask', { title: 'Ação — confirmação ✅' })).isDone, true);
    assert.equal(current.title, 'Ação — confirmação ✅');
    assert.equal((await subtaskService.toggleSubtask('subtask')).isDone, false);
    assert.equal((await subtaskService.toggleSubtask('subtask', false)).isDone, false);
    assert.equal((await subtaskService.toggleSubtask('subtask', true)).isDone, true);
  } finally {
    prisma.subtask.findUnique = findUnique;
    prisma.subtask.update = update;
  }
});
