import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { projectsApi, stagesApi, tasksApi } from './services/api';
import type {
  Project,
  ProjectSummary,
  Task,
  TaskStatus,
  CreateProjectInput,
  CreateStageInput,
  CreateTaskInput,
} from './types';
import { Navbar } from './components/Navbar';
import { TopHeader } from './components/TopHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectList } from './components/ProjectList';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateStageModal } from './components/CreateStageModal';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<'PROJECTS' | 'BOARD'>('PROJECTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState<boolean>(false);
  const [createTaskDefaultStageId, setCreateTaskDefaultStageId] = useState<string | undefined>(undefined);

  // Load project list from backend
  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await projectsApi.list();
      setProjects(data);
      setIsConnected(true);
      return data;
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError('Não foi possível conectar ao servidor backend. Verifique se o serviço está ativo.');
      setIsConnected(false);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load full active project (with stages, tasks, subtasks)
  const loadActiveProject = useCallback(async (id: string) => {
    setLoadingProject(true);
    try {
      setError(null);
      const data = await projectsApi.get(id);
      setActiveProject(data);
      setIsConnected(true);
    } catch (err: any) {
      console.error(`Failed to load project ${id}:`, err);
      setError('Não foi possível carregar os detalhes do projeto selecionado.');
    } finally {
      setLoadingProject(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProjects().then((data) => {
      if (data && data.length > 0 && !activeProjectId) {
        // Automatically focus on the first project if available
        setActiveProjectId(data[0].id);
        setCurrentView('BOARD');
        loadActiveProject(data[0].id);
      }
    });
  }, [loadProjects, activeProjectId, loadActiveProject]);

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

  // Category counts (for legacy sidebar compatibility)
  const categoryCounts = useMemo(() => {
    return {
      ALL: activeTasks.length,
      PROJECT: projects.length,
      COLLEGE: 0,
      PERSONAL: 0,
    };
  }, [activeTasks.length, projects.length]);

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
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Modern Top Header */}
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => handleOpenCreateTask()}
          onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
          isConnected={isConnected}
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
          ) : currentView === 'PROJECTS' || !activeProjectId ? (
            /* Portfolio View: List of all projects */
            <ProjectList
              projects={projects}
              onSelectProject={handleSelectProject}
              onOpenCreateProjectModal={() => setIsCreateProjectModalOpen(true)}
              searchQuery={searchQuery}
            />
          ) : loadingProject ? (
            /* Loading Active Project */
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Carregando etapas e tarefas do projeto...</p>
            </div>
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
              selectedCategory={selectedCategory}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50">
          BrainBoard v2.0 • Projetos, Etapas & MCP Integrado • Produtividade Inteligente
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
    </div>
  );
};
