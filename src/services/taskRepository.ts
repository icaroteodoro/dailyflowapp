import { getDatabase } from './db';
import { ExternalTask } from '../types';

export const TaskRepository = {
  async upsertTasks(tasks: ExternalTask[]): Promise<void> {
    const db = await getDatabase();
    for (const task of tasks) {
      // UPDATE rather than REPLACE preserves daily_plan_items foreign keys.
      await db.execute(`INSERT INTO tasks_cache
        (id, external_id, provider, title, description, status, available_statuses,
         source_id, source_name, due_date, url, updated_at, raw_payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
        status=excluded.status, available_statuses=excluded.available_statuses,
        source_id=excluded.source_id, source_name=excluded.source_name,
        due_date=excluded.due_date, url=excluded.url, updated_at=excluded.updated_at,
        raw_payload=excluded.raw_payload`,
        [task.id, task.externalId, task.provider, task.title, task.description ?? null,
          JSON.stringify(task.status), JSON.stringify(task.availableStatuses), task.sourceId,
          task.sourceName, task.dueDate ?? null, task.url, task.updatedAt, JSON.stringify(task)]);
    }
  },
  async getAllTasks(): Promise<ExternalTask[]> {
    const db = await getDatabase();
    const rows = await db.select<Array<{
      id: string; external_id: string; provider: ExternalTask['provider']; title: string;
      description: string | null; status: string; available_statuses: string;
      source_id: string; source_name: string; due_date: string | null; url: string;
      updated_at: string; raw_payload: string | null;
    }>>('SELECT * FROM tasks_cache ORDER BY updated_at DESC');
    return rows.map(row => ({
      ...(row.raw_payload ? JSON.parse(row.raw_payload) : {}),
      id: row.id, externalId: row.external_id, provider: row.provider, title: row.title,
      description: row.description ?? undefined, status: JSON.parse(row.status),
      availableStatuses: JSON.parse(row.available_statuses || '[]'), sourceId: row.source_id,
      sourceName: row.source_name, dueDate: row.due_date, url: row.url, updatedAt: row.updated_at,
    }));
  },
  async saveVisibleIds(ids: string[]): Promise<void> {
    const db = await getDatabase();
    await db.execute('INSERT OR REPLACE INTO settings (key,value) VALUES ($1,$2)',
      ['visible_task_ids', JSON.stringify(ids)]);
  },
  async getVisibleTasks(): Promise<ExternalTask[]> {
    const tasks = await this.getAllTasks();
    const db = await getDatabase();
    const rows = await db.select<Array<{value: string}>>("SELECT value FROM settings WHERE key='visible_task_ids'");
    // Legacy cache is refreshed by the first successful sync.
    if (!rows.length) return tasks;
    const ids = new Set<string>(JSON.parse(rows[0].value));
    return tasks.filter(task => ids.has(task.id));
  },
  async updateStatus(taskId: string, statusName: string): Promise<void> {
    const task = (await this.getAllTasks()).find(task => task.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada no cache.');
    const status = task.availableStatuses.find(s => s.name.toLowerCase() === statusName.toLowerCase());
    if (!status) throw new Error('Status não disponível para esta tarefa.');
    await this.upsertTasks([{...task, status, updatedAt: new Date().toISOString()}]);
  },
};
