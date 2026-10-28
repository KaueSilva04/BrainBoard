import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import type { RegisterInput, LoginInput, AuthResponse, AuthUser, JwtPayload } from './auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'brainboard-jwt-secret-key-2026-production';
const JWT_EXPIRES_IN = '365d';
const MCP_TOKEN_EXPIRES_IN = '365d';

const AVATAR_PALETTE = [
  '#0ea5e9', // Deep Sky
  '#10b981', // Studio Emerald
  '#f59e0b', // Warm Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index] || '#0ea5e9';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const name = input.name ? input.name.trim() : '';
    const email = input.email ? input.email.toLowerCase().trim() : '';
    const password = input.password;

    if (!name || name.length < 2) {
      throw new ValidationError('O nome deve ter pelo menos 2 caracteres');
    }

    if (!email || !isValidEmail(email)) {
      throw new ValidationError('Formato de e-mail inválido');
    }

    if (!password || password.length < 6) {
      throw new ValidationError('A senha deve ter pelo menos 6 caracteres');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError('Este endereço de e-mail já está em uso');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarColor = pickAvatarColor(email);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        avatarColor,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email ? input.email.toLowerCase().trim() : '';
    const password = input.password;

    if (!email || !password) {
      throw new ValidationError('E-mail e senha são obrigatórios');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ValidationError('Credenciais inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError('Credenciais inválidas');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
      },
    };
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    if (!id) return null;
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        createdAt: true,
      },
    });
  }

  async searchUsers(query: string, limit = 10): Promise<AuthUser[]> {
    const trimmed = query ? query.trim() : '';
    if (!trimmed) return [];

    return await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { email: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
      },
      take: Math.min(Math.max(1, limit), 20),
      orderBy: { name: 'asc' },
    });
  }

  async generateMcpToken(userId: string): Promise<{ token: string; expiresIn: string; user: AuthUser }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      } as JwtPayload,
      JWT_SECRET,
      { expiresIn: MCP_TOKEN_EXPIRES_IN }
    );

    return {
      token,
      expiresIn: String(MCP_TOKEN_EXPIRES_IN),
      user,
    };
  }
}

export const authService = new AuthService();
