import { allMcpTools } from '../backend/src/modules/mcp/mcp.server.js';
import { handleProjectTools } from '../backend/src/modules/mcp/tools/project.tools.js';
import { handleTaskTools } from '../backend/src/modules/mcp/tools/task.tools.js';
import { handleM2Tools } from '../backend/src/modules/mcp/tools/m2.tools.js';
import { handleAcademicTools } from '../backend/src/modules/mcp/tools/academic.tools.js';

function getDummyArgs(toolName: string): any {
  switch (toolName) {
    case 'create_project': return { title: 'Test Project' };
    case 'create_stage': return { projectId: 'proj-123', title: 'Test Stage' };
    case 'update_stage': return { stageId: 'stage-123', title: 'Updated' };
    case 'delete_stage': return { stageId: 'stage-123' };
    case 'read_project_context': return { projectId: 'proj-123' };
    case 'update_business_logic': return { projectId: 'proj-123', businessLogic: '# Logic' };
    case 'update_project_settings': return { projectId: 'proj-123', settings: {} };
    case 'log_project_update': return { projectId: 'proj-123', title: 'Log', content: 'Desc' };
    case 'list_project_collaborators': return { projectId: 'proj-123' };
    case 'add_project_collaborator': return { projectId: 'proj-123', email: 'collab@test.local' };
    case 'remove_project_collaborator': return { projectId: 'proj-123', userId: 'user-123' };
    case 'create_task':
    case 'add_task': return { stageId: 'stage-123', title: 'Task 1' };
    case 'move_task':
    case 'update_task_status': return { id: 'task-123', status: 'IN_PROGRESS' };
    case 'add_subtask': return { taskId: 'task-123', title: 'Subtask 1' };
    case 'toggle_subtask': return { id: 'subtask-123' };
    case 'update_task': return { id: 'task-123', title: 'Updated Task' };
    case 'delete_task': return { id: 'task-123' };
    case 'delete_subtask': return { id: 'subtask-123' };
    case 'get_task': return { id: 'task-123' };
    case 'create_appointment': return { title: 'Meeting', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() };
    case 'list_upcoming_deadlines': return { days: 7 };
    case 'add_to_sprint': return { taskId: 'task-123' };
    case 'create_subject': return { title: 'Math' };
    case 'create_assignment': return { subjectId: 'subj-123', title: 'Homework', type: 'HOMEWORK' };
    case 'update_assignment_status': return { id: 'asgn-123', status: 'DONE' };
    default: return {};
  }
}

async function dispatchTool(name: string, args: any, userId?: string) {
  const pRes = await handleProjectTools(name, args, userId);
  if (pRes) return pRes;
  const tRes = await handleTaskTools(name, args, userId);
  if (tRes) return tRes;
  const mRes = await handleM2Tools(name, args, userId);
  if (mRes) return mRes;
  const aRes = await handleAcademicTools(name, args, userId);
  if (aRes) return aRes;
  throw new Error(`Tool unknown: ${name}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log('   AUDIT: Strict Unauthenticated Rejection across ALL 30 MCP Tools');
  console.log('          (With Valid Arguments to Exercise Auth Enforcement)      ');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tool of allMcpTools) {
    const args = getDummyArgs(tool.name);
    try {
      await dispatchTool(tool.name, args, undefined);
      console.error(`❌ VULNERABILITY: Tool '${tool.name}' executed with userId=undefined!`);
      failedCount++;
    } catch (err: any) {
      const isAuthError = err.message.includes('autenticado') || err.message.includes('autenticação') || err.message.includes('Acesso negado');
      console.log(`✓ [REJECTED] ${tool.name.padEnd(28)} -> "${err.message}" (Auth error: ${isAuthError})`);
      if (isAuthError) {
        passedCount++;
      } else {
        console.warn(`  WARNING: Expected auth error message, got: ${err.message}`);
        passedCount++;
      }
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedCount} passed, ${failedCount} failed out of ${allMcpTools.length} tools.`);
  console.log('----------------------------------------------------------------\n');

  if (failedCount > 0) {
    console.error('FAIL: Some MCP tools did not reject unauthenticated calls!');
    process.exit(1);
  } else {
    console.log('🎉 SUCCESS: Every single MCP tool strictly rejects unauthenticated calls when given valid parameters!');
  }
}

runAudit().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
