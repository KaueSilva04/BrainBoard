import { Router } from 'express';
import * as controller from './academic.controller.js';

export const academicRouter = Router();

// Relative paths (when mounted via app.use('/api/academic', academicRouter))
academicRouter.get('/subjects', controller.listSubjects);
academicRouter.post('/subjects', controller.createSubject);
academicRouter.get('/subjects/:id', controller.getSubjectById);
academicRouter.get('/deadlines', controller.listDeadlines);
academicRouter.post('/deadlines', controller.createDeadline);
academicRouter.patch('/deadlines/:id', controller.updateDeadline);
academicRouter.delete('/deadlines/:id', controller.deleteDeadline);

// Full paths (when mounted directly via app.use(academicRouter))
academicRouter.get('/api/academic/subjects', controller.listSubjects);
academicRouter.post('/api/academic/subjects', controller.createSubject);
academicRouter.get('/api/academic/subjects/:id', controller.getSubjectById);
academicRouter.get('/api/academic/deadlines', controller.listDeadlines);
academicRouter.post('/api/academic/deadlines', controller.createDeadline);
academicRouter.patch('/api/academic/deadlines/:id', controller.updateDeadline);
academicRouter.delete('/api/academic/deadlines/:id', controller.deleteDeadline);
