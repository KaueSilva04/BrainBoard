import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpToolDefinition {
  schema: Tool;
  handler: (args: any) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}
