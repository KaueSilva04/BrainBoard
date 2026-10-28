import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { projectsApi, stagesApi, tasksApi, calendarApi, collaboratorsApi } from './services/api';
import type {
  Project,
  ProjectSummary,
  ProjectCollaborator,
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
import { AcademicView } from './components/academic/AcademicView';
import { CalendarView } from './components/calendar/CalendarView';
import { DashboardOverviewPage } from './components/DashboardOverviewPage';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateStageModal } from './components/CreateStageModal';
import { ProjectCollaboratorsModal } from './components/collaborators/ProjectCollaboratorsModal';
import { AuthView } from './components/auth/AuthView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [isCollaboratorsModalOpen, setIsCollaboratorsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ActiveView>('OVERVIEW');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasProjectsSnapshot, setHasProjectsSnapshot] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState(false);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setSearchQuery('');
  }, [currentView]);

  const [sprintActiveCount, setSprintActiveCount] = useState<number>(0);
  const [calendarCount, setCalendarCount] = useState<number>(0);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState<boolean>(false);
  const [createTaskDefaultStageId, setCreateTaskDefaultStageId] = useState<string | undefined>(undefined);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const data = await projectsApi.list();
      setProjects(data);
      setHasProjectsSnapshot(true);
      setProjectsLoadError(false);
      setIsConnected(true);
      setError(null);
      return data;
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setProjectsLoadError(true);
      if (!silent) {
        setError('Não foi possível atualizar os dados do workspace.');
      }
      setIsConnected(false);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
    } catch (err) {
      console.error('Auto-sync error:', err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [loadProjects, loadActiveProject, activeProjectId]);

  const loadProjectCollaborators = useCallback(async (projectId: string) => {
    try {
      const list = await collaboratorsApi.list(projectId);
      setCollaborators(list);
    } catch (err) {
      console.error('Failed to load project collaborators:', err);
      setCollaborators([]);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectCollaborators(activeProjectId);
    } else {
      setCollaborators([]);
    }
  }, [activeProjectId, loadProjectCollaborators]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadProjects(false).then((data) => {
      if (data && data.length > 0 && !activeProjectId) {
        setActiveProjectId(data[0].id);
        loadActiveProject(data[0].id, false);
      }
    });

    tasksApi.listAll({ isSprintActive: true }).then((t) => setSprintActiveCount(t.length)).catch(() => {});
    calendarApi.getEvents({ includeCompleted: false }).then((e) => setCalendarCount(e.length)).catch(() => {});
  }, [isAuthenticated, loadProjects, activeProjectId, loadActiveProject]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncAll(true);
      }
    }, 30000);

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
  }, [isAuthenticated, syncAll]);

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

  const activeTasks = useMemo<Task[]>(() => {
    if (!activeProject || !activeProject.stages) return [];
    return activeProject.stages.flatMap((stage) => stage.tasks || []);
  }, [activeProject]);

  const displayedTasks = useMemo(() => {
    if (!searchQuery.trim()) return activeTasks;
    const q = searchQuery.toLowerCase().trim();
    return activeTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [activeTasks, searchQuery]);

  const handleCreateProject = async (input: CreateProjectInput) => {
    const newProject = await projectsApi.create(input);
    await loadProjects();
    setActiveProjectId(newProject.id);
    setActiveProject(newProject);
    setCurrentView('BOARD');
  };

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

  const handleDeleteStage = async (stageId: string, stageTitle: string) => {
    if (!activeProject) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a etapa "${stageTitle}" e todas as tarefas vinculadas a ela?`
    );
    if (!confirmed) return;

    const prevProject = activeProject;
    setActiveProject({
      ...activeProject,
      stages: (activeProject.stages || []).filter((s) => s.id !== stageId),
    });

    try {
      await stagesApi.delete(activeProject.id, stageId);
      await loadProjects(true);
    } catch (err) {
      console.error('Failed to delete stage:', err);
      setActiveProject(prevProject);
      alert('Erro ao excluir etapa.');
    }
  };

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

  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    if (!activeProject) return;
    const prevProject = activeProject;

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

  const handleDeleteTask = async (id: string) => {
    if (!activeProject) return;
    const prevProject = activeProject;

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

  const handleToggleSubtask = async (id: string, isDone: boolean) => {
    if (!activeProject) return;
    const prevProject = activeProject;

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

  const handleDeleteSubtask = async (id: string) => {
    if (!activeProject) return;
    const prevProject = activeProject;

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

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700 dark:text-slate-300" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthView />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f3f5fa] text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 lg:flex-row">
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
        onOpenCreateModal={() => handleOpenCreateTask()}
        isConnected={isConnected}
        projectsLoadError={projectsLoadError}
        sprintActiveCount={sprintActiveCount}
        calendarCount={calendarCount}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <TopHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          currentView={currentView}
          onSelectView={setCurrentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => handleOpenCreateTask()}
          onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
          isConnected={isConnected}
          isSyncing={isSyncing}
          onRefresh={() => syncAll(false)}
          activeProject={activeProject}
          onBackToProjects={() => handleSelectProject(null)}
          projects={projects}
          onSelectProject={handleSelectProject}
          collaborators={collaborators}
          onOpenCollaboratorsModal={() => setIsCollaboratorsModalOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-7 sm:py-7 lg:px-9">
          {error && currentView !== 'OVERVIEW' && currentView !== 'CALENDAR' && currentView !== 'ACADEMIC' && currentView !== 'SPRINT' && !(currentView === 'PROJECTS' && projectsLoadError) && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadProjects();
                  if (activeProjectId) loadActiveProject(activeProjectId);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-900 transition-colors hover:bg-rose-200 dark:bg-rose-900/60 dark:text-rose-100 dark:hover:bg-rose-900"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-28">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Carregando BrainBoard...</p>
            </div>
          ) : currentView === 'OVERVIEW' ? (
            <DashboardOverviewPage onSelectView={setCurrentView} onSelectProject={handleSelectProject} />
          ) : currentView === 'PROJECTS' ? (
            <ProjectList
              projects={projects}
              onSelectProject={handleSelectProject}
              onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
              searchQuery={searchQuery}
              onDeleteProject={handleDeleteProject}
              projectsLoadError={projectsLoadError}
              hasProjectsSnapshot={hasProjectsSnapshot}
              onRetryProjects={() => { void loadProjects(true); }}
            />
          ) : currentView === 'SPRINT' ? (
            <SprintKanbanView
              onNavigateToProjects={() => setCurrentView('PROJECTS')}
              onRetryProjects={() => { void loadProjects(true); }}
              hasProjectsSnapshot={hasProjectsSnapshot}
              projectsLoadError={projectsLoadError}
              projectsCount={projects.length}
            />
          ) : currentView === 'ACADEMIC' ? (
            <AcademicView />
          ) : currentView === 'CALENDAR' ? (
            <CalendarView onSelectProject={handleSelectProject} />
          ) : !activeProjectId ? (
            <ProjectList
              projects={projects}
              onSelectProject={handleSelectProject}
              onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
              searchQuery={searchQuery}
              onDeleteProject={handleDeleteProject}
              projectsLoadError={projectsLoadError}
              hasProjectsSnapshot={hasProjectsSnapshot}
              onRetryProjects={() => { void loadProjects(true); }}
            />
          ) : loadingProject ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-28">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Carregando etapas e tarefas do projeto...</p>
            </div>
          ) : currentView === 'PROJECT_SPRINT' ? (
            <SprintKanbanView projectId={activeProject!.id} onOpenCreateTask={() => handleOpenCreateTask()} />
          ) : (
            <KanbanBoard
              project={activeProject}
              stages={activeProject?.stages || []}
              tasks={displayedTasks}
              summaryTasks={activeTasks}
              collaborators={collaborators}
              onOpenCollaboratorsModal={() => setIsCollaboratorsModalOpen(true)}
              searchQuery={searchQuery}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              onDeleteStage={handleDeleteStage}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onOpenCreateTask={handleOpenCreateTask}
              onOpenCreateStage={() => setIsCreateStageModalOpen(true)}
              onOpenCreateModal={() => handleOpenCreateTask()}
            />
          )}
        </main>

        <footer className="border-t border-slate-200/80 bg-white px-5 py-3.5 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#0f1526] dark:text-slate-400">
          BrainBoard • Organização pessoal, projetos e estudos
        </footer>
      </div>

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {activeProjectId && (
        <CreateStageModal
          isOpen={isCreateStageModalOpen}
          onClose={() => setIsCreateStageModalOpen(false)}
          projectId={activeProjectId}
          nextOrder={activeProject?.stages?.length || 0}
          onCreateStage={handleCreateStage}
        />
      )}

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => {
          setIsCreateTaskModalOpen(false);
          setCreateTaskDefaultStageId(undefined);
        }}
        stages={activeProject?.stages || []}
        defaultStageId={createTaskDefaultStageId}
        collaborators={collaborators}
        onCreateTask={handleCreateTask}
      />

      {activeProjectId && (
        <ProjectCollaboratorsModal
          isOpen={isCollaboratorsModalOpen}
          onClose={() => setIsCollaboratorsModalOpen(false)}
          projectId={activeProjectId}
          projectTitle={activeProject?.title || 'Projeto'}
          currentUserId={user?.id}
          onCollaboratorsUpdated={() => loadProjectCollaborators(activeProjectId)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
