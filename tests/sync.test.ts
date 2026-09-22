import { beforeEach, expect, it, vi } from 'vitest';
import { SyncService } from '../src/services/syncService';
import { useAppStore } from '../src/store/useAppStore';
import { task, source, integration } from './fixtures';
const mocks = vi.hoisted(() => ({fetchTasks: vi.fn(), getSources: vi.fn(), upsertTasks: vi.fn(), saveVisibleIds: vi.fn(), saveIntegration: vi.fn()}));
vi.mock('../src/services/keychain', () => ({KeychainService: {getToken: async () => 'token'}}));
vi.mock('../src/providers/ProviderFactory', () => ({ProviderFactory: {getProvider: () => mocks}}));
vi.mock('../src/services/taskRepository', () => ({TaskRepository: mocks}));
vi.mock('../src/services/settingsRepository', () => ({SettingsRepository: mocks}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSources.mockResolvedValue([source]);
  mocks.fetchTasks.mockResolvedValue([task]);
  useAppStore.setState({integration, tasks: [task], dailyPlanItems: [{id:'item', planDate:'2026-09-22', task, sortOrder:0, completedLocally:true}], selectedTaskForDetail:task, isSyncing:false, toast:null});
});
it('keeps the cache and sync timestamp when remote fetching fails', async () => {
  mocks.fetchTasks.mockRejectedValue(new Error('offline'));
  expect((await SyncService.syncNow()).success).toBe(false);
  expect(useAppStore.getState().tasks).toEqual([task]);
  expect(mocks.saveVisibleIds).not.toHaveBeenCalled();
  expect(mocks.saveIntegration).not.toHaveBeenCalled();
  expect(useAppStore.getState().isSyncing).toBe(false);
});
it('updates My Day and an open detail without losing local completion', async () => {
  mocks.fetchTasks.mockResolvedValue([{...task, title:'Atualizada'}]);
  await SyncService.syncNow();
  expect(useAppStore.getState().dailyPlanItems[0].task.title).toBe('Atualizada');
  expect(useAppStore.getState().dailyPlanItems[0].completedLocally).toBe(true);
  expect(useAppStore.getState().selectedTaskForDetail?.title).toBe('Atualizada');
});
it('coalesces simultaneous sync requests', async () => {
  const first = SyncService.syncNow();
  const second = SyncService.syncNow();
  expect(first).toBe(second);
  await first;
  expect(mocks.fetchTasks).toHaveBeenCalledTimes(1);
});
