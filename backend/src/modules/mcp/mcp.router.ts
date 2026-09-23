import { Router } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  createMcpServer,
  sseTransports,
  handleStreamableHttp,
} from './mcp.server.js';

export const mcpRouter = Router();

// Server-Sent Events transport (legacy & modern SSE clients)
mcpRouter.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/messages', res as any);
  sseTransports.set(transport.sessionId, transport);
  const server = createMcpServer();

  res.on('close', () => {
    sseTransports.delete(transport.sessionId);
    server.close().catch(() => {});
  });

  await server.connect(transport);
});

mcpRouter.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessionId
    ? sseTransports.get(sessionId)
    : sseTransports.values().next().value;

  if (transport) {
    await transport.handlePostMessage(req, res as any, req.body);
  } else {
    res.status(404).json({ error: 'MCP session not found' });
  }
});

// Streamable HTTP transport (Codex, Claude Code)
mcpRouter.all('/mcp', handleStreamableHttp);
mcpRouter.post('/mcp/sse', handleStreamableHttp);
