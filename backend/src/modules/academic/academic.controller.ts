import type { Request, Response } from 'express';
import { academicService } from './academic.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export const listSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await academicService.listSubjects();
    res.json(subjects);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const subject = await academicService.getSubjectById(id);
    res.json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { title, description, businessLogic, settings } = req.body;
    const subject = await academicService.createSubject({
      title,
      description,
      businessLogic,
      settings,
    });
    res.status(201).json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const listDeadlines = async (req: Request, res: Response) => {
  try {
    const { projectId, includeCompleted, days } = req.query;
    const deadlines = await academicService.listDeadlines({
      projectId: projectId ? String(projectId).trim() : undefined,
      includeCompleted: includeCompleted === 'true',
      days: days ? parseInt(String(days), 10) : undefined,
    });
    res.json(deadlines);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createDeadline = async (req: Request, res: Response) => {
  try {
    const { stageId, title, description, dueDate } = req.body;
    const deadline = await academicService.createDeadline({
      stageId,
      title,
      description,
      dueDate,
    });
    res.status(201).json(deadline);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateDeadline = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, description, status, dueDate } = req.body;
    const deadline = await academicService.updateDeadline(id, {
      title,
      description,
      status,
      dueDate,
    });
    res.json(deadline);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteDeadline = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await academicService.deleteDeadline(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
