import type { Request, Response } from 'express';
import { academicService } from './academic.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

function getAuthenticatedUserId(req: Request): string | null {
  return req.user?.id ?? null;
}

// --- SUBJECTS ---
export const listSubjects = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const subjects = await academicService.listSubjects(userId);
    res.json(subjects);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const subject = await academicService.createSubject(userId, req.body);
    res.status(201).json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const subject = await academicService.updateSubject(String(req.params.id), userId, req.body);
    res.json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    await academicService.deleteSubject(String(req.params.id), userId);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// --- ASSIGNMENTS ---
export const listAssignments = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const assignments = await academicService.listAssignments(userId, subjectId);
    res.json(assignments);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const assignment = await academicService.createAssignment(userId, req.body);
    res.status(201).json(assignment);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    const assignment = await academicService.updateAssignment(String(req.params.id), userId, req.body);
    res.json(assignment);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    await academicService.deleteAssignment(String(req.params.id), userId);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

