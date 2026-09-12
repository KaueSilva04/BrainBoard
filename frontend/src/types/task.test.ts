import { CATEGORY_LABELS, STATUS_LABELS, Category, Status, Task } from './task';

describe('Task Models and Enums', () => {
  it('should correctly map all category labels', () => {
    expect(CATEGORY_LABELS.PROJECT).toBe('Projetos');
    expect(CATEGORY_LABELS.COLLEGE).toBe('Faculdade');
    expect(CATEGORY_LABELS.PERSONAL).toBe('Pessoais');
  });

  it('should correctly map all status labels', () => {
    expect(STATUS_LABELS.TODO).toBe('A Fazer');
    expect(STATUS_LABELS.IN_PROGRESS).toBe('Em Andamento');
    expect(STATUS_LABELS.DONE).toBe('Concluído');
  });

  it('should support Task structure with nested subtasks', () => {
    const sampleTask: Task = {
      id: 'test-123',
      title: 'Sample Task',
      description: 'Sample Description',
      category: 'PROJECT',
      status: 'TODO',
      createdAt: new Date().toISOString(),
      subtasks: [
        {
          id: 'sub-1',
          title: 'Subtask 1',
          isDone: false,
          taskId: 'test-123',
        },
      ],
    };

    expect(sampleTask.id).toBe('test-123');
    expect(sampleTask.subtasks).toHaveLength(1);
    expect(sampleTask.subtasks[0].isDone).toBe(false);
  });
});
