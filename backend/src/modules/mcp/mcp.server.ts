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

export const allMcpTools = [
  ...projectToolSchemas,
  ...taskToolSchemas,
  ...m2ToolSchemas,
  ...academicToolSchemas,
];

export function createMcpServer(): Server {
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

    const projectResult = await handleProjectTools(name, args);
    if (projectResult) return projectResult;

    const taskResult = await handleTaskTools(name, args);
    if (taskResult) return taskResult;

    const m2Result = await handleM2Tools(name, args);
    if (m2Result) return m2Result;

    const academicResult = await handleAcademicTools(name, args);
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
}

export const streamableSessions = new Map<string, StreamableSession>();

export const handleStreamableHttp = async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
  const sessionIdQuery = req.query.sessionId as string | undefined;
  const sessionId = sessionIdHeader || sessionIdQuery;

  let session = sessionId ? streamableSessions.get(sessionId) : null;

  if (!session) {
    const newSessionId = randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    const server = createMcpServer();
    await server.connect(transport as any);
    session = { transport, server };
    streamableSessions.set(newSessionId, session);
  }

  if (!req.headers.accept || !req.headers.accept.includes('text/event-stream')) {
    req.headers.accept = req.headers.accept
      ? `${req.headers.accept}, text/event-stream`
      : 'application/json, text/event-stream';
  }

  await session.transport.handleRequest(req, res, req.body);
};
