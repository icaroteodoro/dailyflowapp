import type { ExternalTask, IntegrationConfig } from '../src/types';
import type { TaskSource } from '../src/providers/TaskProvider';
export const source: TaskSource = { id: 'list1', name: 'Lista vazia', workspaceId: 'team1', workspaceName: 'Equipe',
  statuses: [{id: 'open', name: 'OPEN', color: '#aaa'}, {id: 'done', name: 'DONE', color: '#0f0', isDone: true}] };
export const task: ExternalTask = {id: 'clickup:1', externalId: '1', provider: 'clickup', title: 'Tarefa',
  status: source.statuses![0], availableStatuses: source.statuses!, sourceId: source.id, sourceName: source.name,
  workspaceId: source.workspaceId, workspaceName: source.workspaceName, spaceName: 'Espaço', folderName: 'Pasta',
  assignees: [{id: '7', username: 'Ana'}], updatedAt: '2026-09-22T12:00:00Z', url: 'https://app.clickup.com/t/1'};
export const integration: IntegrationConfig = {id: 'int_clickup_1', provider: 'clickup', isActive: true,
  selectedSourceIds: [source.id], selectedWorkspaceIds: ['team1'], selectedStatuses: ['OPEN'], lastSyncAt: null};
