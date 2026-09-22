import { getDatabase } from './db';
import { DailyPlanItem, ExternalTask } from '../types';
import { TaskRepository } from './taskRepository';

export const DailyPlanRepository = {
  async reorder(date: string, taskIds: string[]): Promise<void> {
    if (!taskIds.length) return;
    const db = await getDatabase();
    const cases = taskIds.map((_, index) => `WHEN $${index + 2} THEN ${index}`).join(' ');
    await db.execute(`UPDATE daily_plan_items SET sort_order = CASE task_id ${cases} ELSE sort_order END WHERE plan_id = $1`,
      [`plan_${date}`, ...taskIds]);
  },
  /**
   * Obtém o planejamento do dia especificado (formato 'YYYY-MM-DD')
   */
  async getDailyPlan(date: string): Promise<DailyPlanItem[]> {
    try {
      const db = await getDatabase();
      
      // Ensure plan exists
      const planId = `plan_${date}`;
      await db.execute(
        'INSERT OR IGNORE INTO daily_plans (id, date) VALUES ($1, $2)',
        [planId, date]
      );

      const items = await db.select<Array<{
        id: string;
        plan_id: string;
        task_id: string;
        sort_order: number;
        completed_locally: number;
        completed_at: string | null;
      }>>(
        'SELECT * FROM daily_plan_items WHERE plan_id = $1 ORDER BY sort_order ASC',
        [planId]
      );

      const allTasks = await TaskRepository.getAllTasks();
      const taskMap = new Map(allTasks.map((t) => [t.id, t]));

      const planItems: DailyPlanItem[] = [];
      for (const item of items) {
        const task = taskMap.get(item.task_id);
        if (task) {
          planItems.push({
            id: item.id,
            planDate: date,
            task,
            sortOrder: item.sort_order,
            completedLocally: item.completed_locally === 1,
            completedAt: item.completed_at,
          });
        }
      }

      return planItems;
    } catch (error) {
      console.warn('Error loading daily plan from SQLite:', error);
      throw error;
    }
  },

  /**
   * Adiciona tarefas ao planejamento diário
   */
  async addItemsToPlan(date: string, tasks: ExternalTask[]): Promise<void> {
    try {
      const db = await getDatabase();
      const planId = `plan_${date}`;
      await db.execute(
        'INSERT OR IGNORE INTO daily_plans (id, date) VALUES ($1, $2)',
        [planId, date]
      );

      await TaskRepository.upsertTasks(tasks);
      const rows = await db.select<Array<{next_order: number}>>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM daily_plan_items WHERE plan_id = $1', [planId]);
      const nextOrder = rows[0].next_order;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const itemId = `item_${date}_${task.id}`;
        await db.execute(
          `INSERT OR IGNORE INTO daily_plan_items (
            id, plan_id, task_id, sort_order, completed_locally
          ) VALUES ($1, $2, $3, $4, 0)`,
          [itemId, planId, task.id, nextOrder + i]
        );
      }
    } catch (error) {
      console.warn('Error adding items to daily plan in SQLite:', error);
      throw error;
    }
  },

  /**
   * Atualiza a flag de conclusão local da tarefa no Meu Dia
   */
  async toggleCompleteLocally(date: string, taskId: string, completed: boolean): Promise<void> {
    try {
      const db = await getDatabase();
      const planId = `plan_${date}`;
      await db.execute(
        'UPDATE daily_plan_items SET completed_locally = $1, completed_at = $2 WHERE plan_id = $3 AND task_id = $4',
        [completed ? 1 : 0, completed ? new Date().toISOString() : null, planId, taskId]
      );
    } catch (error) {
      console.warn('Error toggling local completion in SQLite:', error);
      throw error;
    }
  },

  /**
   * Remove item do planejamento do dia
   */
  async removeItemFromPlan(date: string, taskId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const planId = `plan_${date}`;
      await db.execute(
        'DELETE FROM daily_plan_items WHERE plan_id = $1 AND task_id = $2',
        [planId, taskId]
      );
    } catch (error) {
      console.warn('Error removing item from daily plan in SQLite:', error);
      throw error;
    }
  },
};
