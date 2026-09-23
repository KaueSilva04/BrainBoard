import { Router } from 'express';
import * as controller from './academic.controller.js';

export const academicRouter = Router();

// --- TERMS ---
academicRouter.get('/terms', controller.listTerms);
academicRouter.post('/terms', controller.createTerm);
academicRouter.get('/terms/:id', controller.getTermById);
academicRouter.patch('/terms/:id', controller.updateTerm);
academicRouter.delete('/terms/:id', controller.deleteTerm);

// --- SUBJECTS ---
academicRouter.post('/subjects', controller.createSubject);
academicRouter.patch('/subjects/:id', controller.updateSubject);
academicRouter.delete('/subjects/:id', controller.deleteSubject);

// --- ASSIGNMENTS ---
academicRouter.post('/assignments', controller.createAssignment);
academicRouter.patch('/assignments/:id', controller.updateAssignment);
academicRouter.delete('/assignments/:id', controller.deleteAssignment);

// Full paths for legacy mounting
academicRouter.get('/api/academic/terms', controller.listTerms);
academicRouter.post('/api/academic/terms', controller.createTerm);
academicRouter.get('/api/academic/terms/:id', controller.getTermById);
academicRouter.patch('/api/academic/terms/:id', controller.updateTerm);
academicRouter.delete('/api/academic/terms/:id', controller.deleteTerm);

academicRouter.post('/api/academic/subjects', controller.createSubject);
academicRouter.patch('/api/academic/subjects/:id', controller.updateSubject);
academicRouter.delete('/api/academic/subjects/:id', controller.deleteSubject);

academicRouter.post('/api/academic/assignments', controller.createAssignment);
academicRouter.patch('/api/academic/assignments/:id', controller.updateAssignment);
academicRouter.delete('/api/academic/assignments/:id', controller.deleteAssignment);
