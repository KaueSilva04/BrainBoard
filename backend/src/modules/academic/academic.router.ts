import { Router } from 'express';
import * as controller from './academic.controller.js';

export const academicRouter = Router();

// --- SUBJECTS ---
academicRouter.post('/subjects', controller.createSubject);
academicRouter.patch('/subjects/:id', controller.updateSubject);
academicRouter.delete('/subjects/:id', controller.deleteSubject);

// --- ASSIGNMENTS ---
academicRouter.post('/assignments', controller.createAssignment);
academicRouter.patch('/assignments/:id', controller.updateAssignment);
academicRouter.delete('/assignments/:id', controller.deleteAssignment);

// Full paths for legacy mounting
academicRouter.post('/api/academic/subjects', controller.createSubject);
academicRouter.patch('/api/academic/subjects/:id', controller.updateSubject);
academicRouter.delete('/api/academic/subjects/:id', controller.deleteSubject);

academicRouter.post('/api/academic/assignments', controller.createAssignment);
academicRouter.patch('/api/academic/assignments/:id', controller.updateAssignment);
academicRouter.delete('/api/academic/assignments/:id', controller.deleteAssignment);
