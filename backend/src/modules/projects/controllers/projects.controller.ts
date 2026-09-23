import type { Request, Response } from 'express';
import { projectService, VALID_PROJECT_STATUSES, VALID_PROJECT_TYPES } from '../services/project.service.js';
import { stageService, VALID_STAGE_STATUSES } from '../services/stage.service.js';
import { updateLogService } from '../services/update-log.service.js';
import { memberService } from '../services/member.service.js';
import { taskService, VALID_STATUSES } from '../services/task.service.js';
import { subtaskService } from '../services/subtask.service.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';

// ==========================================
// PROJECTS CONTROLLER
// ==========================================

export const listProjects = async (req: Request, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;

    if (status && !VALID_PROJECT_STATUSES.includes(status as any)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }
    if (type && !VALID_PROJECT_TYPES.includes(type as any)) {
      return res.status(400).json({
        error: `Invalid project type: ${type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`,
      });
    }

    const projects = await projectService.listProjects({
      status,
      type,
    });
    res.json(projects);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const project = await projectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { title, description, businessLogic, status, type, githubRepo, settings } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (status !== undefined && !VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }
    if (type !== undefined && !VALID_PROJECT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid project type: ${type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`,
      });
    }

    const project = await projectService.createProject({
      title,
      description,
      businessLogic,
      status,
      type,
      githubRepo,
      settings,
    });
    res.status(201).json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, description, businessLogic, status, type, githubRepo, settings } = req.body;

    if (status !== undefined && !VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }
    if (type !== undefined && !VALID_PROJECT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid project type: ${type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`,
      });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const project = await projectService.updateProject(id, {
      title,
      description,
      businessLogic,
      status,
      type,
      githubRepo,
      settings,
    });
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateBusinessLogic = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { businessLogic } = req.body;
    if (businessLogic === undefined || typeof businessLogic !== 'string') {
      return res.status(400).json({ error: 'businessLogic string is required' });
    }

    const project = await projectService.updateBusinessLogic(id, businessLogic);
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateProjectSettings = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { githubRepo, settings, businessLogic } = req.body;

    const project = await projectService.updateProjectSettings(id, {
      githubRepo,
      settings,
      businessLogic,
    });
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await projectService.deleteProject(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// STAGES CONTROLLER
// ==========================================

export const listStagesByProject = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const stages = await stageService.listStagesByProject(projectId);
    res.json(stages);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { title, order, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STAGE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid stage status: ${status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`,
      });
    }

    const stage = await stageService.createStage({
      projectId,
      title,
      order: typeof order === 'number' ? order : undefined,
      status,
    });
    res.status(201).json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getStageById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const stage = await stageService.getStageById(id);
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, order, status } = req.body;

    if (status !== undefined && !VALID_STAGE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid stage status: ${status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`,
      });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const stage = await stageService.updateStage(id, {
      title,
      order,
      status,
    });
    res.json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteStage = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await stageService.deleteStage(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// UPDATE LOGS CONTROLLER
// ==========================================

export const listLogsByProject = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

    const logs = await updateLogService.listLogsByProject(projectId, limit);
    res.json(logs);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createLog = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { title, content, author } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const log = await updateLogService.createLog({
      projectId,
      title,
      content,
      author,
    });
    res.status(201).json(log);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getLogById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const log = await updateLogService.getLogById(id);
    if (!log) {
      return res.status(404).json({ error: 'UpdateLog not found' });
    }
    res.json(log);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteLog = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await updateLogService.deleteLog(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'UpdateLog not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// MEMBERS CONTROLLER
// ==========================================

export const listMembersByProject = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const members = await memberService.listMembersByProject(projectId);
    res.json(members);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const { name, role, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const member = await memberService.createMember({
      projectId,
      name,
      role,
      email,
    });
    res.status(201).json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const member = await memberService.getMemberById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, role, email } = req.body;

    const member = await memberService.updateMember(id, {
      name,
      role,
      email,
    });
    res.json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await memberService.deleteMember(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// TASKS CONTROLLER
// ==========================================

export const listTasks = async (req: Request, res: Response) => {
  try {
    const { status, isSprintActive, hasDueDate } = req.query;
    const stageId = req.query.stageId ? String(req.query.stageId).trim() : undefined;
    const statusStr = status ? String(status) : undefined;

    if (statusStr && !VALID_STATUSES.includes(statusStr as any)) {
      return res.status(400).json({
        error: `Invalid status: ${statusStr}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const tasks = await taskService.listTasks({
      stageId,
      status: statusStr,
      isSprintActive: isSprintActive !== undefined ? isSprintActive === 'true' : undefined,
      hasDueDate: hasDueDate !== undefined ? hasDueDate === 'true' : undefined,
    });
    res.json(tasks);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const listTasksByStage = async (req: Request, res: Response) => {
  try {
    const stageId = String(req.params.stageId);
    const tasks = await taskService.listTasks({ stageId });
    res.json(tasks);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const task = await taskService.getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const stageIdFromParams = req.params?.stageId;
    const { title, stageId: stageIdFromBody, description, status, dueDate, isSprintActive } = req.body;
    const rawStageId = stageIdFromParams || stageIdFromBody;
    const stageId = rawStageId ? String(rawStageId).trim() : '';

    if (!stageId) {
      return res.status(400).json({ error: 'stageId is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const task = await taskService.createTask({
      stageId,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      status,
      dueDate,
      isSprintActive,
    });
    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, title, description, stageId, dueDate, isSprintActive } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const task = await taskService.updateTask(id, {
      status,
      title,
      description,
      stageId,
      dueDate,
      isSprintActive,
    });
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const task = await taskService.updateTask(id, { status });
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await taskService.deleteTask(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// SUBTASKS CONTROLLER
// ==========================================

export const createSubtask = async (req: Request, res: Response) => {
  try {
    const taskId = String(req.params.id);
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const subtask = await subtaskService.createSubtask(taskId, title);
    res.status(201).json(subtask);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const toggleSubtask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const isDone = typeof req.body.isDone === 'boolean' ? req.body.isDone : undefined;
    const subtask = await subtaskService.toggleSubtask(id, isDone);
    res.json(subtask);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteSubtask = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await subtaskService.deleteSubtask(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.status(500).json({ error: error.message });
  }
};
