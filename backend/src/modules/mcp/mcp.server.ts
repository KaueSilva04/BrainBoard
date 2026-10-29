import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { projectToolSchemas, handleProjectTools } from './tools/project.tools.js';
import { taskToolSchemas, handleTaskTools } from './tools/task.tools.js';
import { m2ToolSchemas, handleM2Tools } from './tools/m2.tools.js';
import { academicToolSchemas, handleAcademicTools } from './tools/academic.tools.js';
import { resolveMcpUser } from '../auth/auth.middleware.js';

export const allMcpTools = [
  ...projectToolSchemas,
  ...taskToolSchemas,
  ...m2ToolSchemas,
  ...academicToolSchemas,
];

export function createMcpServer(userId?: string): Server {
  const server = new Server(
    {
      name: 'brainboard-mcp',
      version: '2.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allMcpTools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const projectResult = await handleProjectTools(name, args, userId);
    if (projectResult) return projectResult;

    const taskResult = await handleTaskTools(name, args, userId);
    if (taskResult) return taskResult;

    const m2Result = await handleM2Tools(name, args, userId);
    if (m2Result) return m2Result;

    const academicResult = await handleAcademicTools(name, args, userId);
    if (academicResult) return academicResult;

    throw new Error(`Tool unknown: ${name}`);
  });

  return server;
}

export const mcpServer = createMcpServer();

export const sseTransports = new Map<string, SSEServerTransport>();

export interface StreamableSession {
  transport: StreamableHTTPServerTransport;
  server: Server;
  userId?: string | undefined;
}

export const streamableSessions = new Map<string, StreamableSession>();

export const handleStreamableHttp = async (req: Request, res: Response) => {
  const mcpUser = await resolveMcpUser(req);
  if (!mcpUser) {
    res.status(401).json({ error: 'Autenticação necessária para o servidor MCP' });
    return;
  }

  const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
  const sessionIdQuery = req.query.sessionId as string | undefined;
  const sessionId = sessionIdHeader || sessionIdQuery;

  let session = sessionId ? streamableSessions.get(sessionId) : null;

  if (session && session.userId && session.userId !== mcpUser.id) {
    res.status(403).json({ error: 'Acesso negado: a sessão MCP pertence a outro usuário' });
    return;
  }

  if (!session) {
    const newSessionId = randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    const server = createMcpServer(mcpUser?.id);
    await server.connect(transport as any);
    const createdSession: StreamableSession = { transport, server, userId: mcpUser?.id };
    session = createdSession;
    streamableSessions.set(newSessionId, createdSession);
  }

  if (!req.headers.accept || !req.headers.accept.includes('text/event-stream')) {
    req.headers.accept = req.headers.accept
      ? `${req.headers.accept}, text/event-stream`
      : 'application/json, text/event-stream';
  }

  await session.transport.handleRequest(req, res, req.body);
};
