export type ProviderType = 'clickup' | 'linear' | 'jira';

export interface TaskStatus {
  id: string;
  name: string;
  color?: string;
  orderindex?: number;
  isDone?: boolean;
}

export interface TaskAssignee {
  id: string;
  username: string;
  email?: string;
  color?: string;
  avatarUrl?: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface ExternalTask {
  id: string;                   // 'clickup:12345'
  externalId: string;           // '12345'
  provider: ProviderType;
  title: string;
  description?: string;
  status: TaskStatus;
  availableStatuses: TaskStatus[];
  assignees?: TaskAssignee[];
  workspaceId?: string;
  workspaceName?: string;
  spaceId?: string;
  spaceName?: string;
  folderId?: string;
  folderName?: string;
  sourceId: string;             // List or project ID
  sourceName: string;           // List name (e.g., 'Daily Sprint')
  dueDate?: string | null;      // ISO or formatted
  url: string;                  // Direct link to task
  updatedAt: string;
}

export interface DailyPlanItem {
  id: string;
  planDate: string;             // 'YYYY-MM-DD'
  task: ExternalTask;
  sortOrder: number;
  completedLocally: boolean;    // Marked completed only in My Day
  completedAt?: string | null;
}

export interface IntegrationConfig {
  id: string;
  provider: ProviderType;
  isActive: boolean;
  selectedWorkspaceIds?: string[];
  selectedWorkspaceNames?: string[];
  selectedSourceIds: string[];
  selectedAssigneeIds?: string[]; // Only tasks assigned to these users (e.g. User X)
  selectedAssigneeNames?: string[];
  selectedStatuses: string[];   // Only tasks matching these statuses
  hideDoneTasks?: boolean;       // Hide closed/done tasks
  lastSyncAt: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  text: string;
  authorName?: string;
  createdAt: string;
}

export interface CompletionShortcut {
  id: string;
  name: string;
  targetStatus: string;
  targetStatusColor?: string;
  assigneeToMentionId?: string;
  assigneeToMentionName?: string;
  assigneeToMentionAvatar?: string;
  commentTemplate: string;
  isEnabled: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export type ActiveTab = 'my-day' | 'all-tasks' | 'settings';

