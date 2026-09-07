import { ITaskProvider, TaskSource, Workspace, CreateTaskDTO } from '../TaskProvider';
import { ExternalTask, TaskStatus } from '../../types';

export class ClickUpProvider implements ITaskProvider {
  private baseUrl = 'https://api.clickup.com/api/v2';

  private async request<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cleanToken = token.trim();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: cleanToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ClickUp API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async validateToken(token: string): Promise<{ isValid: boolean; username?: string; error?: string }> {
    try {
      const data = await this.request<{ user: { username: string; email: string } }>('/user', token);
      return {
        isValid: true,
        username: data.user?.username || data.user?.email || 'Usuário ClickUp',
      };
    } catch (e: any) {
      return {
        isValid: false,
        error: e.message || 'Token inválido ou sem autorização.',
      };
    }
  }

  async getCurrentUser(
    token: string
  ): Promise<{ id: string; username: string; email?: string; color?: string; avatarUrl?: string } | null> {
    try {
      const data = await this.request<{
        user: { id: number | string; username: string; email: string; color?: string; profilePicture?: string };
      }>('/user', token);
      if (!data.user) return null;
      return {
        id: String(data.user.id),
        username: data.user.username || data.user.email,
        email: data.user.email,
        color: data.user.color,
        avatarUrl: data.user.profilePicture,
      };
    } catch {
      return null;
    }
  }

  async getWorkspaceMembers(
    token: string,
    workspaceIds?: string[]
  ): Promise<Array<{ id: string; username: string; email?: string; color?: string; avatarUrl?: string; workspaceId?: string }>> {
    try {
      const data = await this.request<{
        teams: Array<{
          id: string;
          name: string;
          members?: Array<{
            user: {
              id: number | string;
              username: string;
              email?: string;
              color?: string;
              profilePicture?: string;
            };
          }>;
        }>;
      }>('/team', token);

      const members: Array<{
        id: string;
        username: string;
        email?: string;
        color?: string;
        avatarUrl?: string;
        workspaceId?: string;
      }> = [];

      const seenUserIds = new Set<string>();

      for (const team of data.teams || []) {
        if (workspaceIds && workspaceIds.length > 0 && !workspaceIds.includes(String(team.id))) {
          continue;
        }

        for (const m of team.members || []) {
          const u = m.user;
          if (u && !seenUserIds.has(String(u.id))) {
            seenUserIds.add(String(u.id));
            members.push({
              id: String(u.id),
              username: u.username || u.email || 'Membro',
              email: u.email,
              color: u.color,
              avatarUrl: u.profilePicture,
              workspaceId: String(team.id),
            });
          }
        }
      }

      return members;
    } catch (e) {
      console.warn('Error fetching ClickUp workspace members:', e);
      return [];
    }
  }

  async getWorkspaces(token: string): Promise<Workspace[]> {
    try {
      const data = await this.request<{ teams: Array<{ id: string; name: string }> }>('/team', token);
      return (data.teams || []).map((t) => ({ id: String(t.id), name: t.name }));
    } catch {
      return [];
    }
  }

  async getSources(token: string, workspaceIds?: string[]): Promise<TaskSource[]> {
    try {
      let teams: Workspace[] = await this.getWorkspaces(token);
      if (workspaceIds && workspaceIds.length > 0) {
        teams = teams.filter((t) => workspaceIds.includes(t.id));
      }

      if (teams.length === 0) return [];

      const sources: TaskSource[] = [];

      await Promise.all(
        teams.map(async (team) => {
          try {
            const spacesData = await this.request<{
              spaces: Array<{
                id: string;
                name: string;
                statuses?: Array<{ status: string; color: string; type?: string }>;
              }>;
            }>(`/team/${team.id}/space?archived=false`, token);

            await Promise.all(
              (spacesData.spaces || []).map(async (space) => {
                const spaceStatuses = (space.statuses || []).map((s) => ({
                  id: s.status.toLowerCase(),
                  name: s.status.toUpperCase(),
                  color: s.color,
                  isDone: ['done', 'closed', 'complete'].includes(s.status.toLowerCase()),
                }));

                const [folderlessListsRes, foldersRes] = await Promise.all([
                  this.request<{
                    lists: Array<{
                      id: string;
                      name: string;
                      statuses?: Array<{ status: string; color: string; type?: string }>;
                    }>;
                  }>(`/space/${space.id}/list?archived=false`, token).catch(() => ({ lists: [] })),
                  this.request<{
                    folders: Array<{
                      id: string;
                      name: string;
                      lists: Array<{
                        id: string;
                        name: string;
                        statuses?: Array<{ status: string; color: string; type?: string }>;
                      }>;
                    }>;
                  }>(`/space/${space.id}/folder?archived=false`, token).catch(() => ({ folders: [] })),
                ]);

                // 1. Folderless lists
                (folderlessListsRes.lists || []).forEach((list) => {
                  const listStatuses =
                    list.statuses && list.statuses.length > 0
                      ? list.statuses.map((s) => ({
                          id: s.status.toLowerCase(),
                          name: s.status.toUpperCase(),
                          color: s.color,
                          isDone: ['done', 'closed', 'complete'].includes(s.status.toLowerCase()),
                        }))
                      : spaceStatuses;

                  sources.push({
                    id: String(list.id),
                    name: list.name,
                    workspaceId: team.id,
                    workspaceName: team.name,
                    spaceId: String(space.id),
                    spaceName: space.name,
                    statuses: listStatuses,
                  });
                });

                // 2. Lists inside folders
                (foldersRes.folders || []).forEach((folder) => {
                  (folder.lists || []).forEach((list) => {
                    const listStatuses =
                      list.statuses && list.statuses.length > 0
                        ? list.statuses.map((s) => ({
                            id: s.status.toLowerCase(),
                            name: s.status.toUpperCase(),
                            color: s.color,
                            isDone: ['done', 'closed', 'complete'].includes(s.status.toLowerCase()),
                          }))
                        : spaceStatuses;

                    sources.push({
                      id: String(list.id),
                      name: list.name,
                      workspaceId: team.id,
                      workspaceName: team.name,
                      spaceId: String(space.id),
                      spaceName: space.name,
                      folderId: String(folder.id),
                      folderName: folder.name,
                      statuses: listStatuses,
                    });
                  });
                });
              })
            );
          } catch {
            // ignore team error
          }
        })
      );

      return sources;
    } catch (error) {
      console.warn('Error fetching ClickUp sources:', error);
      return [];
    }
  }

  async fetchTasks(
    token: string,
    sources: TaskSource[],
    options?: {
      selectedStatuses?: string[];
      selectedAssigneeIds?: string[];
      hideDoneTasks?: boolean;
    }
  ): Promise<ExternalTask[]> {
    if (sources.length === 0) return [];

    const fetchSingleList = async (source: TaskSource): Promise<ExternalTask[]> => {
      try {
        const queryParams = ['archived=false', 'subtasks=true'];

        if (options?.hideDoneTasks) {
          queryParams.push('include_closed=false');
        } else {
          queryParams.push('include_closed=true');
        }

        if (options?.selectedAssigneeIds && options.selectedAssigneeIds.length > 0) {
          options.selectedAssigneeIds.forEach((uid) => {
            queryParams.push(`assignees[]=${encodeURIComponent(uid)}`);
          });
        }

        if (options?.selectedStatuses && options.selectedStatuses.length > 0) {
          options.selectedStatuses.forEach((st) => {
            queryParams.push(`statuses[]=${encodeURIComponent(st.toLowerCase())}`);
          });
        }

        const url = `/list/${source.id}/task?${queryParams.join('&')}`;
        const data = await this.request<{
          tasks: Array<{
            id: string;
            name: string;
            text_content?: string;
            description?: string;
            url: string;
            status: { status: string; color: string; orderindex?: number; type?: string };
            date_updated?: string;
            due_date?: string;
            assignees?: Array<{
              id: number | string;
              username: string;
              email?: string;
              color?: string;
              profilePicture?: string;
            }>;
          }>;
        }>(url, token);

        const listTasks: ExternalTask[] = [];

        for (const t of data.tasks || []) {
          const statusName = (t.status?.status || 'TO DO').toUpperCase();
          const isDone = ['done', 'complete', 'closed'].includes(statusName.toLowerCase());

          if (options?.hideDoneTasks && isDone) continue;

          if (options?.selectedStatuses && options.selectedStatuses.length > 0) {
            const matches = options.selectedStatuses.some(
              (st) => st.toUpperCase() === statusName
            );
            if (!matches) continue;
          }

          if (options?.selectedAssigneeIds && options.selectedAssigneeIds.length > 0) {
            const taskAssigneeIds = (t.assignees || []).map((a) => String(a.id));
            const hasSelectedAssignee = options.selectedAssigneeIds.some((uid) =>
              taskAssigneeIds.includes(uid)
            );
            if (!hasSelectedAssignee) continue;
          }

          const statusObj: TaskStatus = {
            id: t.status?.status?.toLowerCase() || 'open',
            name: statusName,
            color: t.status?.color || '#3b82f6',
            orderindex: t.status?.orderindex,
            isDone,
          };

          let formattedDueDate: string | undefined = undefined;
          if (t.due_date) {
            try {
              const d = new Date(parseInt(t.due_date, 10));
              formattedDueDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            } catch {
              formattedDueDate = undefined;
            }
          }

          const taskAssignees = (t.assignees || []).map((a) => ({
            id: String(a.id),
            username: a.username,
            email: a.email,
            color: a.color,
            avatarUrl: a.profilePicture,
          }));

          listTasks.push({
            id: `clickup:${t.id}`,
            externalId: String(t.id),
            provider: 'clickup',
            title: t.name,
            description: t.text_content || t.description || undefined,
            status: statusObj,
            availableStatuses: (source.statuses || []).map((s) => ({
              id: s.id,
              name: s.name,
              color: s.color,
              isDone: s.isDone,
            })),
            assignees: taskAssignees,
            workspaceId: source.workspaceId,
            workspaceName: source.workspaceName,
            spaceId: source.spaceId,
            spaceName: source.spaceName,
            folderId: source.folderId,
            folderName: source.folderName,
            sourceId: source.id,
            sourceName: source.name,
            dueDate: formattedDueDate,
            url: t.url || `https://app.clickup.com/t/${t.id}`,
            updatedAt: t.date_updated ? new Date(parseInt(t.date_updated, 10)).toISOString() : new Date().toISOString(),
          });
        }

        return listTasks;
      } catch (e) {
        console.warn(`Error fetching tasks for list ${source.id}:`, e);
        return [];
      }
    };

    // Parallel chunk processing with concurrency of 6
    const CONCURRENCY = 6;
    const allTasks: ExternalTask[] = [];

    for (let i = 0; i < sources.length; i += CONCURRENCY) {
      const chunk = sources.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map((s) => fetchSingleList(s)));
      results.forEach((listTasks) => allTasks.push(...listTasks));
    }

    return allTasks;
  }

  async updateTaskStatus(token: string, taskId: string, statusName: string): Promise<void> {
    const rawId = taskId.replace('clickup:', '');
    await this.request(`/task/${rawId}`, token, {
      method: 'PUT',
      body: JSON.stringify({ status: statusName.toLowerCase() }),
    });
  }

  async createComment(token: string, taskId: string, comment: string): Promise<void> {
    const rawId = taskId.replace('clickup:', '');
    await this.request(`/task/${rawId}/comment`, token, {
      method: 'POST',
      body: JSON.stringify({ comment_text: comment }),
    });
  }

  async createTask(token: string, data: CreateTaskDTO): Promise<ExternalTask> {
    const payload: any = {
      name: data.title,
    };
    if (data.description) payload.description = data.description;
    if (data.dueDate) {
      const ms = Date.parse(data.dueDate);
      if (!isNaN(ms)) payload.due_date = ms;
    }

    const res = await this.request<{
      id: string;
      name: string;
      description?: string;
      url: string;
      status: { status: string; color: string };
      list: { id: string; name: string };
      space?: { id: string; name: string };
      folder?: { id: string; name: string };
    }>(`/list/${data.listId}/task`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: `clickup:${res.id}`,
      externalId: String(res.id),
      provider: 'clickup',
      title: res.name,
      description: res.description,
      status: {
        id: res.status?.status?.toLowerCase() || 'to_do',
        name: (res.status?.status || 'TO DO').toUpperCase(),
        color: res.status?.color || '#87909e',
        isDone: false,
      },
      availableStatuses: [
        { id: 'to_do', name: 'TO DO', color: '#87909e' },
        { id: 'in_progress', name: 'IN PROGRESS', color: '#3b82f6' },
        { id: 'done', name: 'DONE', color: '#10b981', isDone: true },
      ],
      sourceId: String(data.listId),
      sourceName: res.list?.name || 'Lista',
      spaceName: res.space?.name,
      folderName: res.folder?.name,
      dueDate: data.dueDate,
      url: res.url || `https://app.clickup.com/t/${res.id}`,
      updatedAt: new Date().toISOString(),
    };
  }
}
