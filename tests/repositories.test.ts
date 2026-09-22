// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { TaskRepository } from '../src/services/taskRepository';
import { DailyPlanRepository } from '../src/services/dailyPlanRepository';
import { task } from './fixtures';
import { localDateKey } from '../src/utils/date';
const adapter = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn() }));
vi.mock('../src/services/db', () => ({getDatabase: async () => adapter}));
let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const rust = readFileSync('src-tauri/src/lib.rs', 'utf8');
  db.exec(rust.match(/sql: "([\s\S]*?)",\s*kind:/)![1]);
  adapter.execute.mockImplementation(async (sql: string, values: any[] = []) => db.prepare(sql).run(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]))));
  adapter.select.mockImplementation(async (sql: string, values: any[] = []) => db.prepare(sql).all(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]))));
});
afterEach(() => db.close());
it('preserves My Day and completion when a cached task is updated', async () => {
  await DailyPlanRepository.addItemsToPlan('2026-09-22', [task]);
  await DailyPlanRepository.toggleCompleteLocally('2026-09-22', task.id, true);
  await TaskRepository.upsertTasks([{...task, title: 'Atualizada'}]);
  const items = await DailyPlanRepository.getDailyPlan('2026-09-22');
  expect(items).toHaveLength(1);
  expect(items[0].completedLocally).toBe(true);
  expect(items[0].task.title).toBe('Atualizada');
  expect(items[0].task.assignees).toEqual(task.assignees);
  expect(items[0].task.folderName).toBe('Pasta');
});
it('appends batches in order and persists reordering', async () => {
  const second = {...task, id: 'clickup:2', externalId: '2'};
  await DailyPlanRepository.addItemsToPlan('2026-09-22', [task]);
  await DailyPlanRepository.addItemsToPlan('2026-09-22', [second]);
  expect((await DailyPlanRepository.getDailyPlan('2026-09-22')).map(i => i.sortOrder)).toEqual([0, 1]);
  await DailyPlanRepository.reorder('2026-09-22', [second.id, task.id]);
  expect((await DailyPlanRepository.getDailyPlan('2026-09-22')).map(i => i.task.id)).toEqual([second.id, task.id]);
});
it('reconciles visible tasks without deleting daily history', async () => {
  await DailyPlanRepository.addItemsToPlan('2026-09-22', [task]);
  await TaskRepository.saveVisibleIds([]);
  expect(await TaskRepository.getVisibleTasks()).toEqual([]);
  expect(await DailyPlanRepository.getDailyPlan('2026-09-22')).toHaveLength(1);
});
it('propagates write errors', async () => {
  adapter.execute.mockRejectedValueOnce(new Error('disk full'));
  await expect(TaskRepository.upsertTasks([task])).rejects.toThrow('disk full');
});
it('uses the local date at 21h in Maceió', () => {
  expect(localDateKey(new Date('2026-09-23T00:30:00Z'))).toBe('2026-09-22');
});
