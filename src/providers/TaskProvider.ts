import { ExternalTask } from '../types';

export interface Workspace {
  id: string;
  name: string;
}

export interface TaskSource {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  spaceId?: string;
  spaceName?: string;
  folderId?: string;
  folderName?: string;
  statuses?: Array<{ id: string; name: string; color: string; isDone?: boolean }>;
}

export interface CreateTaskDTO {
  listId: string;
  title: string;
  description?: string;
  dueDate?: string;
}

export interface ITaskProvider {
  /**
   * Valida o token e retorna informações básicas do usuário se válido
   */
  validateToken(token: string): Promise<{ isValid: boolean; username?: string; error?: string }>;

  /**
   * Obtém as equipes / workspaces disponíveis
   */
  getWorkspaces(token: string): Promise<Workspace[]>;

  /**
   * Obtém as fontes (listas/projetos) para seleção filtradas por workspace(s)
   */
  getSources(token: string, workspaceIds?: string[]): Promise<TaskSource[]>;

  /**
   * Obtém os membros/usuários dos workspaces selecionados
   */
  getWorkspaceMembers(
    token: string,
    workspaceIds?: string[]
  ): Promise<Array<{ id: string; username: string; email?: string; color?: string; avatarUrl?: string; workspaceId?: string }>>;

  /**
   * Obtém o usuário atualmente autenticado
   */
  getCurrentUser(
    token: string
  ): Promise<{ id: string; username: string; email?: string; color?: string; avatarUrl?: string } | null>;

  /**
   * Busca as tarefas das listas selecionadas com filtros de status e responsável
   */
  fetchTasks(
    token: string,
    sources: TaskSource[],
    options?: {
      selectedStatuses?: string[];
      selectedAssigneeIds?: string[];
      hideDoneTasks?: boolean;
    }
  ): Promise<ExternalTask[]>;

  /**
   * Atualiza o status de uma tarefa no provedor remoto
   */
  updateTaskStatus(token: string, taskId: string, statusName: string): Promise<void>;

  /**
   * Adiciona um comentário a uma tarefa no provedor remoto
   */
  createComment(
    token: string,
    taskId: string,
    comment: string,
    options?: { notifyAssigneeId?: string; assigneeName?: string }
  ): Promise<void>;

  /**
   * Cria uma nova tarefa na lista especificada
   */
  createTask(token: string, data: CreateTaskDTO): Promise<ExternalTask>;
}
