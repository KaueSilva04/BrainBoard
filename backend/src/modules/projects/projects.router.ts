import { Router } from 'express';
import * as controller from './controllers/projects.controller.js';

export const projectsRouter = Router();

// Projects
projectsRouter.get('/api/projects', controller.listProjects);
projectsRouter.get('/api/projects/:id', controller.getProjectById);
projectsRouter.post('/api/projects', controller.createProject);
projectsRouter.patch('/api/projects/:id', controller.updateProject);
projectsRouter.patch('/api/projects/:id/business-logic', controller.updateBusinessLogic);
projectsRouter.patch('/api/projects/:id/settings', controller.updateProjectSettings);
projectsRouter.delete('/api/projects/:id', controller.deleteProject);

// Stages
projectsRouter.get('/api/projects/:projectId/stages', controller.listStagesByProject);
projectsRouter.post('/api/projects/:projectId/stages', controller.createStage);
projectsRouter.get('/api/stages/:id', controller.getStageById);
projectsRouter.patch('/api/stages/:id', controller.updateStage);
projectsRouter.delete('/api/stages/:id', controller.deleteStage);

// Update Logs
projectsRouter.get('/api/projects/:projectId/update-logs', controller.listLogsByProject);
projectsRouter.post('/api/projects/:projectId/update-logs', controller.createLog);
projectsRouter.get('/api/update-logs/:id', controller.getLogById);
projectsRouter.delete('/api/update-logs/:id', controller.deleteLog);

// Members
projectsRouter.get('/api/projects/:projectId/members', controller.listMembersByProject);
projectsRouter.post('/api/projects/:projectId/members', controller.createMember);
projectsRouter.get('/api/members/:id', controller.getMemberById);
projectsRouter.patch('/api/members/:id', controller.updateMember);
projectsRouter.delete('/api/members/:id', controller.deleteMember);

// Tasks
projectsRouter.get('/api/tasks', controller.listTasks);
projectsRouter.get('/api/stages/:stageId/tasks', controller.listTasksByStage);
projectsRouter.get('/api/tasks/:id', controller.getTaskById);
projectsRouter.post('/api/tasks', controller.createTask);
projectsRouter.post('/api/stages/:stageId/tasks', controller.createTask);
projectsRouter.patch('/api/tasks/:id', controller.updateTask);
projectsRouter.patch('/api/tasks/:id/status', controller.updateTaskStatus);
projectsRouter.delete('/api/tasks/:id', controller.deleteTask);

// Subtasks
projectsRouter.post('/api/tasks/:id/subtasks', controller.createSubtask);
projectsRouter.patch('/api/subtasks/:id', controller.toggleSubtask);
projectsRouter.patch('/api/subtasks/:id/toggle', controller.toggleSubtask);
projectsRouter.delete('/api/subtasks/:id', controller.deleteSubtask);
