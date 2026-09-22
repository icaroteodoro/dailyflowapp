import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { ActiveTab, CompletionShortcut, DailyPlanItem, ExternalTask, IntegrationConfig, ToastNotification } from '../types';
import { TaskSource } from '../providers/TaskProvider';
import { TaskRepository } from '../services/taskRepository';
import { DailyPlanRepository } from '../services/dailyPlanRepository';
import { SettingsRepository } from '../services/settingsRepository';
import { localDateKey } from '../utils/date';
import { CompletionService } from '../services/completionService';

interface AppState {
  // UI & Drawer state
  isExpanded: boolean;
  activeTab: ActiveTab;
  searchQuery: string;
  selectedTaskForDetail: ExternalTask | null;
  isQuickCreateOpen: boolean;
  toast: ToastNotification | null;
  
  // Sync state
  isSyncing: boolean;
  lastSyncTime: string | null;
  
  // Integrations & Sources
  integration: IntegrationConfig | null;
  availableSources: TaskSource[];
  completionShortcut: CompletionShortcut | null;
  
  // Data
  tasks: ExternalTask[];
  dailyPlanItems: DailyPlanItem[];
  selectedTaskIdsForMyDay: Set<string>;

  // Initializer
  loadLocalData: () => Promise<void>;
  refreshDay: () => Promise<void>;
  planDate: string;
  busyTaskIds: Set<string>;

  // Actions
  setIsExpanded: (expanded: boolean) => Promise<void>;
  toggleExpanded: () => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTaskForDetail: (task: ExternalTask | null) => void;
  setIsQuickCreateOpen: (open: boolean) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;
  
  // Task Actions
  setTasks: (tasks: ExternalTask[]) => void;
  toggleSelectTaskForMyDay: (taskId: string) => void;
  clearSelectedTaskIds: () => void;
  
  // Daily Plan Actions
  addToMyDay: (taskIds: string[]) => Promise<void>;
  removeFromMyDay: (taskId: string) => Promise<void>;
  toggleCompleteLocally: (taskId: string) => Promise<void>;
  reorderMyDay: (sourceIndex: number, destIndex: number) => Promise<void>;

  updateTaskStatus: (taskId: string, newStatusName: string) => Promise<void>;
  
  // Completion Shortcut Automation
  setCompletionShortcut: (shortcut: CompletionShortcut) => Promise<void>;
  executeCompletionShortcut: (taskId: string) => Promise<boolean>;

  // Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  setIntegration: (integration: IntegrationConfig | null) => void;
  setAvailableSources: (sources: TaskSource[]) => void;
}

let dailyWrite: Promise<unknown> = Promise.resolve();
function serializeDailyWrite(action: () => Promise<void>): Promise<void> {
  const next = dailyWrite.then(action);
  dailyWrite = next.catch(() => undefined);
  return next;
}

export const useAppStore = create<AppState>((set, get) => ({
  isExpanded: false,
  activeTab: 'my-day',
  searchQuery: '',
  selectedTaskForDetail: null,
  isQuickCreateOpen: false,
  
  toast: null,
  
  isSyncing: false,
  lastSyncTime: null,
  
  integration: null,
  availableSources: [],
  completionShortcut: null,
  planDate: localDateKey(),
  busyTaskIds: new Set<string>(),
  tasks: [],
  dailyPlanItems: [],
  selectedTaskIdsForMyDay: new Set<string>(),

  loadLocalData: async () => {
    const today = localDateKey();
    try {
      const [cachedTasks, dailyPlan, integration, shortcut] = await Promise.all([
        TaskRepository.getVisibleTasks(),
        DailyPlanRepository.getDailyPlan(today),
        SettingsRepository.getIntegration(),
        SettingsRepository.getCompletionShortcut(),
      ]);

      set({ tasks: integration ? cachedTasks : [], dailyPlanItems: integration ? dailyPlan : [], planDate: today });
      if (integration) {
        set({ integration, lastSyncTime: integration.lastSyncAt });
      }
      if (shortcut) {
        set({ completionShortcut: shortcut });
      }

      // Restore sources from local cache if saved
      const savedSources = localStorage.getItem('df_available_sources');
      if (savedSources) {
        try {
          set({ availableSources: JSON.parse(savedSources) });
        } catch {
          // ignore
        }
      }
    } catch (e) {
      get().showToast({type: 'error', title: 'Não foi possível carregar os dados locais', message: String(e)});
    }
  },

  refreshDay: async () => {
    const today = localDateKey();
    if (today === get().planDate) return;
    const dailyPlanItems = get().integration ? await DailyPlanRepository.getDailyPlan(today) : [];
    set({ dailyPlanItems, planDate: today });
  },

  setIsExpanded: async (expanded) => {
    try {
      await invoke('set_drawer_state', { expanded });
    } catch {
      // Fallback
    }
    set({ isExpanded: expanded });
  },
  toggleExpanded: async () => {
    const next = !get().isExpanded;
    try {
      await invoke('set_drawer_state', { expanded: next });
    } catch {
      // Fallback
    }
    set({ isExpanded: next });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedTaskForDetail: (task) => set({ selectedTaskForDetail: task }),
  setIsQuickCreateOpen: (isQuickCreateOpen) => set({ isQuickCreateOpen }),
  
  showToast: (toastData) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    set({ toast: { ...toastData, id } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 4000);
  },
  hideToast: () => set({ toast: null }),

  setCompletionShortcut: async (shortcut) => {
    await SettingsRepository.saveCompletionShortcut(shortcut);
    set({ completionShortcut: shortcut });
  },

  executeCompletionShortcut: async (taskId) => {
    if (get().busyTaskIds.has(taskId)) return false;
    set({ busyTaskIds: new Set([...get().busyTaskIds, taskId]) });
    try {
      const task = get().tasks.find(t => t.id === taskId) || get().dailyPlanItems.find(i => i.task.id === taskId)?.task;
      const shortcut = get().completionShortcut;
      if (!task || !shortcut?.isEnabled) return false;
      const result = await CompletionService.executeShortcut(task, shortcut);
      if (result.updatedStatus !== task.status.name) await get().updateTaskStatus(taskId, result.updatedStatus);
      if (result.success && get().dailyPlanItems.some(i => i.task.id === taskId && !i.completedLocally)) {
        await get().toggleCompleteLocally(taskId);
        if (get().dailyPlanItems.some(i => i.task.id === taskId && !i.completedLocally)) {
          throw new Error('ClickUp atualizado, mas não foi possível salvar a conclusão no Meu Dia.');
        }
      }
      get().showToast({ type: result.success ? 'success' : 'warning', title: result.success ? 'Automação concluída' : 'Automação incompleta', message: result.message });
      return result.success;
    } catch (error) {
      get().showToast({type: 'error', title: 'Falha ao salvar o resultado', message: String(error)});
      return false;
    } finally {
      const busyTaskIds = new Set(get().busyTaskIds);
      busyTaskIds.delete(taskId);
      set({busyTaskIds});
    }
  },

  setTasks: (tasks) => {
    const byId = new Map(tasks.map(task => [task.id, task]));
    set(state => ({ tasks,
      dailyPlanItems: state.dailyPlanItems.map(item => ({...item, task: byId.get(item.task.id) || item.task})),
      selectedTaskForDetail: state.selectedTaskForDetail ? byId.get(state.selectedTaskForDetail.id) || state.selectedTaskForDetail : null,
      selectedTaskIdsForMyDay: new Set([...state.selectedTaskIdsForMyDay].filter(id => byId.has(id))),
    }));
  },

  toggleSelectTaskForMyDay: (taskId) =>
    set((state) => {
      const next = new Set(state.selectedTaskIdsForMyDay);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return { selectedTaskIdsForMyDay: next };
    }),

  clearSelectedTaskIds: () => set({ selectedTaskIdsForMyDay: new Set<string>() }),

  addToMyDay: (taskIds) => serializeDailyWrite(async () => {
    try {
    await get().refreshDay();
    const state = get();
    const today = localDateKey();
    const existingTaskIds = new Set(state.dailyPlanItems.map((item) => item.task.id));
    
    const tasksToAdd: ExternalTask[] = [];

    taskIds.forEach((id) => {
      if (!existingTaskIds.has(id)) {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          existingTaskIds.add(id);
          tasksToAdd.push(task);

        }
      }
    });

    if (tasksToAdd.length > 0) {
      await DailyPlanRepository.addItemsToPlan(today, tasksToAdd);
    }

    set({
      dailyPlanItems: await DailyPlanRepository.getDailyPlan(today),
      selectedTaskIdsForMyDay: new Set<string>(),
      activeTab: 'my-day',
    });
    } catch (error) { get().showToast({type: 'error', title: 'Não foi possível salvar o Meu Dia', message: String(error)}); }
  }),

  removeFromMyDay: (taskId) => serializeDailyWrite(async () => {
    try {
    await get().refreshDay();
    const today = localDateKey();
    await DailyPlanRepository.removeItemFromPlan(today, taskId);
    set((state) => ({
      dailyPlanItems: state.dailyPlanItems.filter((item) => item.task.id !== taskId),
    }));
    } catch (error) { get().showToast({type: 'error', title: 'Não foi possível salvar o Meu Dia', message: String(error)}); }
  }),

  toggleCompleteLocally: (taskId) => serializeDailyWrite(async () => {
    try {
    await get().refreshDay();
    const today = localDateKey();
    const currentItem = get().dailyPlanItems.find((i) => i.task.id === taskId);
    if (!currentItem) return;
    const nextCompleted = !currentItem.completedLocally;
    await DailyPlanRepository.toggleCompleteLocally(today, taskId, nextCompleted);

    set((state) => ({
      dailyPlanItems: state.dailyPlanItems.map((item) => {
        if (item.task.id === taskId) {
          return {
            ...item,
            completedLocally: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null,
          };
        }
        return item;
      }),
    }));
    } catch (error) { get().showToast({type: 'error', title: 'Não foi possível salvar o Meu Dia', message: String(error)}); }
  }),

  reorderMyDay: (sourceIndex, destIndex) => serializeDailyWrite(async () => {
    try {
      await get().refreshDay();
      const items = [...get().dailyPlanItems];
      if (sourceIndex < 0 || destIndex < 0 || sourceIndex >= items.length || destIndex >= items.length) return;
      const [removed] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, removed);
      await DailyPlanRepository.reorder(get().planDate, items.map(i => i.task.id));
      set({dailyPlanItems: items.map((item, sortOrder) => ({...item, sortOrder}))});
    } catch (error) { get().showToast({type: 'error', title: 'Não foi possível salvar a ordem', message: String(error)}); }
  }),

  updateTaskStatus: async (taskId, newStatusName) => {
    await TaskRepository.updateStatus(taskId, newStatusName);
    set((state) => {
      const updateList = (tasks: ExternalTask[]) =>
        tasks.map((t) => {
          if (t.id === taskId) {
            const foundStatus = t.availableStatuses.find(
              (s) => s.name.toLowerCase() === newStatusName.toLowerCase()
            );
            return {
              ...t,
              status: foundStatus || {
                id: newStatusName.toLowerCase(),
                name: newStatusName,
                isDone: ['done', 'complete', 'closed'].includes(newStatusName.toLowerCase()),
              },
            };
          }
          return t;
        });

      return {
        tasks: updateList(state.tasks),
        dailyPlanItems: state.dailyPlanItems.map((item) =>
          item.task.id === taskId
            ? { ...item, task: updateList([item.task])[0] }
            : item
        ),
        selectedTaskForDetail:
          state.selectedTaskForDetail?.id === taskId
            ? updateList([state.selectedTaskForDetail])[0]
            : state.selectedTaskForDetail,
      };
    });
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setIntegration: (integration) => set({ integration }),
  setAvailableSources: (availableSources) => {
    set({ availableSources });
    localStorage.setItem('df_available_sources', JSON.stringify(availableSources));
  },
}));
