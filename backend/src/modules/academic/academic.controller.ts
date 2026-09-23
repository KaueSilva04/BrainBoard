import type { Request, Response } from 'express';
import { academicService } from './academic.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

// --- TERMS ---
export const listTerms = async (req: Request, res: Response) => {
  try {
    const terms = await academicService.listTerms();
    res.json(terms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTermById = async (req: Request, res: Response) => {
  try {
    const term = await academicService.getTermById(String(req.params.id));
    res.json(term);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const createTerm = async (req: Request, res: Response) => {
  try {
    const term = await academicService.createTerm(req.body);
    res.status(201).json(term);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateTerm = async (req: Request, res: Response) => {
  try {
    const term = await academicService.updateTerm(String(req.params.id), req.body);
    res.json(term);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteTerm = async (req: Request, res: Response) => {
  try {
    await academicService.deleteTerm(String(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// --- SUBJECTS ---
export const createSubject = async (req: Request, res: Response) => {
  try {
    const subject = await academicService.createSubject(req.body);
    res.status(201).json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const subject = await academicService.updateSubject(String(req.params.id), req.body);
    res.json(subject);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    await academicService.deleteSubject(String(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

// --- ASSIGNMENTS ---
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await academicService.createAssignment(req.body);
    res.status(201).json(assignment);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await academicService.updateAssignment(String(req.params.id), req.body);
    res.json(assignment);
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    await academicService.deleteAssignment(String(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
};
