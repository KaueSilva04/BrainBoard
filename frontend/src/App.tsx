import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { projectsApi, stagesApi, tasksApi, calendarApi } from './services/api';
import type {
  Project,
  ProjectSummary,
  Task,
  TaskStatus,
  ActiveView,
  CreateProjectInput,
  CreateStageInput,
  CreateTaskInput,
} from './types';
import { Navbar } from './components/Navbar';
import { TopHeader } from './components/TopHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectList } from './components/ProjectList';
import { SprintKanbanView } from './components/sprint/SprintKanbanView';
import { ProjectSprintsView } from './components/sprint/ProjectSprintsView';
import { AcademicView } from './components/academic/AcademicView';
import { CalendarView } from './components/calendar/CalendarView';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateStageModal } from './components/CreateStageModal';
import { CreateAppointmentModal } from './components/calendar/CreateAppointmentModal';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<ActiveView>('PROJECTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Badges counters
  const [sprintActiveCount, setSprintActiveCount] = useState<number>(0);
  const [calendarCount, setCalendarCount] = useState<number>(0);

  // Modals state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState<boolean>(false);
  const [isCreateAppointmentModalOpen, setIsCreateAppointmentModalOpen] = useState<boolean>(false);
  const [createTaskDefaultStageId, setCreateTaskDefaultStageId] = useState<string | undefined>(undefined);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load project list from backend (supports silent refresh)
  const loadProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const data = await projectsApi.list();
      setProjects(data);
      setIsConnected(true);
      return data;
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      if (!silent) {
        setError('Não foi possível conectar ao servidor backend. Verifique se o serviço está ativo.');
      }
      setIsConnected(false);
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Load full active project with stages & tasks (supports silent refresh)
  const loadActiveProject = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingProject(true);
    try {
      if (!silent) setError(null);
      const data = await projectsApi.get(id);
      setActiveProject(data);
      setIsConnected(true);
      return data;
    } catch (err: any) {
      console.error(`Failed to load project ${id}:`, err);
      if (!silent) {
        setError('Não foi possível carregar os detalhes do projeto selecionado.');
      }
      return null;
    } finally {
      if (!silent) setLoadingProject(false);
    }
  }, []);

  // Master sync function
  const syncAll = useCallback(async (silent = true) => {
    if (!silent) setIsSyncing(true);
    try {
      const currentList = await loadProjects(silent);
      if (activeProjectId) {
        await loadActiveProject(activeProjectId, silent);
      } else if (currentList && currentList.length > 0) {
        setActiveProjectId(currentList[0].id);
        await loadActiveProject(currentList[0].id, silent);
      }

    // Sync badge counters in parallel
      try {
        const [sprintTasks, eventsList] = await Promise.all([
          tasksApi.listAll({ isSprintActive: true }).catch(() => []),
          calendarApi.getEvents({ includeCompleted: false }).catch(() => []),
        ]);
        setSprintActiveCount(sprintTasks.length);
        setCalendarCount(eventsList.length);
      } catch (e) {
        // Non-blocking for badge updates
      }

      setIsConnected(true);
    } catch (err) {
      console.error('Auto-sync error:', err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [loadProjects, loadActiveProject, activeProjectId]);

  // Initial load
  useEffect(() => {
    loadProjects(false).then((data) => {
      if (data && data.length > 0 && !activeProjectId) {
        setActiveProjectId(data[0].id);
        loadActiveProject(data[0].id, false);
      }
    });

    tasksApi.listAll({ isSprintActive: true }).then((t) => setSprintActiveCount(t.length)).catch(() => {});
    calendarApi.getEvents({ includeCompleted: false }).then((e) => setCalendarCount(e.length)).catch(() => {});
  }, [loadProjects, activeProjectId, loadActiveProject]);

  // Real-time automatic background polling (every 3.5 seconds) & focus sync
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncAll(true);
      }
    }, 3500);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncAll(true);
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [syncAll]);

  // Handler for selecting a project
  const handleSelectProject = (id: string | null) => {
    if (!id) {
      setActiveProjectId(null);
      setActiveProject(null);
      setCurrentView('PROJECTS');
    } else {
      setActiveProjectId(id);
      setCurrentView('BOARD');
      loadActiveProject(id);
    }
  };

  // Flattened tasks from active project stages
  const activeTasks = useMemo<Task[]>(() => {
    if (!activeProject || !activeProject.stages) return [];
    return activeProject.stages.flatMap((stage) => stage.tasks || []);
  }, [activeProject]);

  // Filter tasks by search query
  const displayedTasks = useMemo(() => {
    if (!searchQuery.trim()) return activeTasks;
    const q = searchQuery.toLowerCase().trim();
    return activeTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [activeTasks, searchQuery]);


  // Project Creation Handler
  const handleCreateProject = async (input: CreateProjectInput) => {
    const newProject = await projectsApi.create(input);
    await loadProjects();
    setActiveProjectId(newProject.id);
    setActiveProject(newProject);
    setCurrentView('BOARD');
  };

  // Stage Creation Handler
  const handleCreateStage = async (projectId: string, input: CreateStageInput) => {
    const newStage = await stagesApi.create(projectId, input);
    const completeStage: typeof newStage = {
      ...newStage,
      tasks: newStage.tasks || [],
    };
    setActiveProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        stages: [...(prev.stages || []), completeStage],
      };
    });
  };

  // Task Creation Handler
  const handleCreateTask = async (stageId: string, input: CreateTaskInput) => {
    const newTask = await tasksApi.create(stageId, input);
    const completeTask: Task = {
      ...newTask,
      subtasks: newTask.subtasks || [],
    };
    setActiveProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        stages: (prev.stages || []).map((stage) =>
          stage.id === stageId
            ? { ...stage, tasks: [...(stage.tasks || []), completeTask] }
            : stage
        ),
      };
    });
  };

  // Task Move / Status Update Handler
  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    if (!activeProject) return;
    const prevProject = activeProject;

    // Optimistic update
    setActiveProject({
      ...activeProject,
      stages: activeProject.stages.map((stage) => ({
        ...stage,
        tasks: stage.tasks.map((t) =>
          t.id === id ? { ...t, status: newStatus } : t
        ),
      })),
    });

    try {
      await tasksApi.updateStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
      setActiveProject(prevProject);
      alert('Erro ao atualizar status da tarefa.');
    }
  };

  // Task Delete Handler
  const handleDeleteTask = async (id: string) => {
    if (!activeProject) return;
    const prevProject = activeProject;

    // Optimistic update
    setActiveProject({
      ...activeProject,
      stages: activeProject.stages.map((stage) => ({
        ...stage,
        tasks: stage.tasks.filter((t) => t.id !== id),
      })),
    });

    try {
      await tasksApi.delete(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setActiveProject(prevProject);
      alert('Erro ao excluir tarefa.');
    }
  };

  // Subtask Add Handler
  const handleAddSubtask = async (taskId: string, title: string) => {
    const newSubtask = await tasksApi.addSubtask(taskId, title);
    setActiveProject((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        stages: prev.stages.map((stage) => ({
          ...stage,
          tasks: stage.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
              : t
          ),
        })),
      };
    });
  };

  // Subtask Toggle Handler
  const handleToggleSubtask = async (id: string, isDone: boolean) => {
    if (!activeProject) return;
    const prevProject = activeProject;

    // Optimistic update
    setActiveProject({
      ...activeProject,
      stages: activeProject.stages.map((stage) => ({
        ...stage,
        tasks: stage.tasks.map((t) => ({
          ...t,
          subtasks: (t.subtasks || []).map((st) =>
            st.id === id ? { ...st, isDone } : st
          ),
        })),
      })),
    });

    try {
      await tasksApi.toggleSubtask(id, isDone);
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      setActiveProject(prevProject);
    }
  };

  // Subtask Delete Handler
  const handleDeleteSubtask = async (id: string) => {
    if (!activeProject) return;
    const prevProject = activeProject;

    // Optimistic update
    setActiveProject({
      ...activeProject,
      stages: activeProject.stages.map((stage) => ({
        ...stage,
        tasks: stage.tasks.map((t) => ({
          ...t,
          subtasks: (t.subtasks || []).filter((st) => st.id !== id),
        })),
      })),
    });

    try {
      await tasksApi.deleteSubtask(id);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      setActiveProject(prevProject);
    }
  };

  const handleOpenCreateTask = (stageId?: string) => {
    setCreateTaskDefaultStageId(stageId);
    setIsCreateTaskModalOpen(true);
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o projeto "${title}" e todos os seus dados?`)) {
      try {
        await projectsApi.delete(id);
        if (activeProjectId === id) {
          handleSelectProject(null);
        }
        await loadProjects();
      } catch (err) {
        console.error('Failed to delete project:', err);
        alert('Erro ao excluir projeto.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 flex flex-col md:flex-row">
      {/* Lateral Sidebar Navigation */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
          onOpenCreateModal={() => handleOpenCreateTask()}
          isConnected={isConnected}
          sprintActiveCount={sprintActiveCount}
          calendarCount={calendarCount}
        />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Modern Top Header */}
        <TopHeader
          currentView={currentView}
          onSelectView={setCurrentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => handleOpenCreateTask()}
          onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
          onOpenCreateAppointmentModal={() => setIsCreateAppointmentModalOpen(true)}
          isConnected={isConnected}
          isSyncing={isSyncing}
          onRefresh={() => syncAll(false)}
          activeProject={activeProject}
          onBackToProjects={() => handleSelectProject(null)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Error Banner if connection fails */}
          {error && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => {
                  loadProjects();
                  if (activeProjectId) loadActiveProject(activeProjectId);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          )}

          {/* Loading View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Carregando BrainBoard...</p>
            </div>
          ) : currentView === 'PROJECTS' ? (
            /* Portfolio View: List of all projects */
            <ProjectList
              projects={projects}
              onSelectProject={handleSelectProject}
              onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
              searchQuery={searchQuery}
              onDeleteProject={handleDeleteProject}
            />
          ) : currentView === 'SPRINT' ? (
            /* Sprint Kanban View */
            <SprintKanbanView onOpenCreateTask={() => handleOpenCreateTask()} />
          ) : currentView === 'ACADEMIC' ? (
            /* Academic View: Subjects & Deadlines */
            <AcademicView />
          ) : currentView === 'CALENDAR' ? (
            /* Calendar & Appointments View */
            <CalendarView onSelectProject={handleSelectProject} />
          ) : !activeProjectId ? (
            /* Fallback to Project List if Board has no active project */
            <ProjectList
              projects={projects}
              onSelectProject={handleSelectProject}
              onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
              searchQuery={searchQuery}
              onDeleteProject={handleDeleteProject}
            />
          ) : loadingProject ? (
            /* Loading Active Project */
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Carregando etapas e tarefas do projeto...</p>
            </div>
          ) : currentView === 'PROJECT_SPRINTS' ? (
            <ProjectSprintsView project={activeProject!} />
          ) : (
            /* Active Project Kanban View */
            <KanbanBoard
              project={activeProject}
              stages={activeProject?.stages || []}
              tasks={displayedTasks}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onOpenCreateTask={handleOpenCreateTask}
              onOpenCreateStage={() => setIsCreateStageModalOpen(true)}
              onOpenCreateModal={() => handleOpenCreateTask()}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50">
          BrainBoard v2.0 • Projetos, Sprint, Acadêmico & Calendário • Produtividade Inteligente
        </footer>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Create Stage Modal */}
      {activeProjectId && (
        <CreateStageModal
          isOpen={isCreateStageModalOpen}
          onClose={() => setIsCreateStageModalOpen(false)}
          projectId={activeProjectId}
          nextOrder={activeProject?.stages?.length || 0}
          onCreateStage={handleCreateStage}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => {
          setIsCreateTaskModalOpen(false);
          setCreateTaskDefaultStageId(undefined);
        }}
        stages={activeProject?.stages || []}
        defaultStageId={createTaskDefaultStageId}
        onCreateTask={handleCreateTask}
      />

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={isCreateAppointmentModalOpen}
        onClose={() => setIsCreateAppointmentModalOpen(false)}
        onAppointmentCreated={() => syncAll(true)}
      />


    </div>
  );
};
