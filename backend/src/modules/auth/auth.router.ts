import { Router } from 'express';
import * as controller from './auth.controller.js';
import { authMiddleware } from './auth.middleware.js';

export const authRouter = Router();

// Public auth endpoints
authRouter.post('/api/auth/register', controller.register);
authRouter.post('/register', controller.register);

authRouter.post('/api/auth/login', controller.login);
authRouter.post('/login', controller.login);

authRouter.post('/api/auth/logout', controller.logout);
authRouter.post('/logout', controller.logout);

// Protected user endpoints
authRouter.get('/api/auth/me', authMiddleware, controller.getCurrentUser);
authRouter.get('/me', authMiddleware, controller.getCurrentUser);
authRouter.get('/api/auth/mcp-token', authMiddleware, controller.createMcpToken);
authRouter.post('/api/auth/mcp-token', authMiddleware, controller.createMcpToken);
authRouter.get('/mcp-token', authMiddleware, controller.createMcpToken);
authRouter.post('/mcp-token', authMiddleware, controller.createMcpToken);

authRouter.get('/api/users/search', authMiddleware, controller.searchUsers);
authRouter.get('/search', authMiddleware, controller.searchUsers);

