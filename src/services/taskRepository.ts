import { getDatabase } from './db';
import { ExternalTask } from '../types';

export const TaskRepository = {
  /**
   * Salva ou atualiza a lista de tarefas cacheadas no SQLite
   */
  async upsertTasks(tasks: ExternalTask[]): Promise<void> {
    try {
      const db = await getDatabase();
      for (const task of tasks) {
        await db.execute(
          `INSERT OR REPLACE INTO tasks_cache (
            id, external_id, provider, title, description, status, available_statuses, source_id, source_name, due_date, url, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            task.id,
            task.externalId,
            task.provider,
            task.title,
            task.description || null,
            JSON.stringify(task.status),
            JSON.stringify(task.availableStatuses),
            task.sourceId,
            task.sourceName,
            task.dueDate || null,
            task.url,
            task.updatedAt || new Date().toISOString(),
          ]
        );
      }
    } catch (error) {
      console.warn('Error saving tasks to SQLite cache:', error);
    }
  },

  /**
   * Obtém todas as tarefas em cache
   */
  async getAllTasks(): Promise<ExternalTask[]> {
    try {
      const db = await getDatabase();
      const rows = await db.select<Array<{
        id: string;
        external_id: string;
        provider: string;
        title: string;
        description: string | null;
        status: string;
        available_statuses: string;
        source_id: string;
        source_name: string;
        due_date: string | null;
        url: string;
        updated_at: string;
      }>>('SELECT * FROM tasks_cache ORDER BY updated_at DESC');

      return rows.map((row) => ({
        id: row.id,
        externalId: row.external_id,
        provider: row.provider as 'clickup',
        title: row.title,
        description: row.description || undefined,
        status: JSON.parse(row.status),
        availableStatuses: JSON.parse(row.available_statuses || '[]'),
        sourceId: row.source_id,
        sourceName: row.source_name,
        dueDate: row.due_date || undefined,
        url: row.url,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.warn('Error loading tasks from SQLite cache:', error);
      return [];
    }
  },

  /**
   * Atualiza o status de uma tarefa no cache SQLite
   */
  async updateStatus(taskId: string, statusName: string): Promise<void> {
    try {
      const db = await getDatabase();
      const tasks = await this.getAllTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const found = task.availableStatuses.find(
          (s) => s.name.toLowerCase() === statusName.toLowerCase()
        ) || {
          id: statusName.toLowerCase(),
          name: statusName,
          isDone: ['done', 'closed', 'complete'].includes(statusName.toLowerCase()),
        };

        await db.execute(
          'UPDATE tasks_cache SET status = $1, updated_at = $2 WHERE id = $3',
          [JSON.stringify(found), new Date().toISOString(), taskId]
        );
      }
    } catch (error) {
      console.warn('Error updating task status in SQLite:', error);
    }
  },
};
