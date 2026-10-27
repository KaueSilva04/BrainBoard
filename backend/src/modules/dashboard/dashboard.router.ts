import { Router } from 'express';
import { getDashboardOverview } from './dashboard.controller.js';

export const dashboardRouter = Router();
dashboardRouter.get('/api/dashboard/overview', getDashboardOverview);
