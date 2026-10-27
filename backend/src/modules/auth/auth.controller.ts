import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Erro ao registrar usuário' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.json(result);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Erro ao realizar login' });
  }
}

export async function logout(req: Request, res: Response) {
  return res.json({
    success: true,
    message: 'Sessão encerrada com sucesso',
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao obter dados do usuário' });
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const query = req.query.q ? String(req.query.q) : '';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const users = await authService.searchUsers(query, limit);
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao buscar usuários' });
  }
}

export async function createMcpToken(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const result = await authService.generateMcpToken(req.user.id);
    return res.json(result);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Erro ao gerar token MCP' });
  }
}
