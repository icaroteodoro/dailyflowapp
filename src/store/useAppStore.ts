import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { ActiveTab, DailyPlanItem, ExternalTask, IntegrationConfig } from '../types';
import { TaskSource } from '../providers/TaskProvider';
import { TaskRepository } from '../services/taskRepository';
import { DailyPlanRepository } from '../services/dailyPlanRepository';
import { SettingsRepository } from '../services/settingsRepository';

interface AppState {
  // UI & Drawer state
  isExpanded: boolean;
  activeTab: ActiveTab;
  searchQuery: string;
  selectedTaskForDetail: ExternalTask | null;
  isQuickCreateOpen: boolean;
  
  // Sync state
  isSyncing: boolean;
  lastSyncTime: string | null;
  
  // Integrations & Sources
  integration: IntegrationConfig | null;
  availableSources: TaskSource[];
  
  // Data
  tasks: ExternalTask[];
  dailyPlanItems: DailyPlanItem[];
  selectedTaskIdsForMyDay: Set<string>;

  // Initializer
  loadLocalData: () => Promise<void>;

  // Actions
  setIsExpanded: (expanded: boolean) => Promise<void>;
  toggleExpanded: () => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTaskForDetail: (task: ExternalTask | null) => void;
  setIsQuickCreateOpen: (open: boolean) => void;
  
  // Task Actions
  setTasks: (tasks: ExternalTask[]) => void;
  toggleSelectTaskForMyDay: (taskId: string) => void;
  clearSelectedTaskIds: () => void;
  
  // Daily Plan Actions
  addToMyDay: (taskIds: string[]) => void;
  removeFromMyDay: (taskId: string) => void;
  toggleCompleteLocally: (taskId: string) => void;
  reorderMyDay: (sourceIndex: number, destIndex: number) => void;
  
  // Task Updates
  updateTaskStatus: (taskId: string, newStatusName: string) => void;
  
  // Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  setIntegration: (integration: IntegrationConfig | null) => void;
  setAvailableSources: (sources: TaskSource[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isExpanded: true,
  activeTab: 'my-day',
  searchQuery: '',
  selectedTaskForDetail: null,
  isQuickCreateOpen: false,
  
  isSyncing: false,
  lastSyncTime: null,
  
  integration: null,
  availableSources: [],
  tasks: [],
  dailyPlanItems: [],
  selectedTaskIdsForMyDay: new Set<string>(),

  loadLocalData: async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const [cachedTasks, dailyPlan, integration] = await Promise.all([
        TaskRepository.getAllTasks(),
        DailyPlanRepository.getDailyPlan(today),
        SettingsRepository.getIntegration(),
      ]);

      if (cachedTasks.length > 0) {
        set({ tasks: cachedTasks });
      }
      if (dailyPlan.length > 0) {
        set({ dailyPlanItems: dailyPlan });
      }
      if (integration) {
        set({ integration, lastSyncTime: integration.lastSyncAt });
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
      console.warn('Error loading initial local data:', e);
    }
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
  
  setTasks: (tasks) => {
    set({ tasks });
    TaskRepository.upsertTasks(tasks);
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

  addToMyDay: (taskIds) => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    const existingTaskIds = new Set(state.dailyPlanItems.map((item) => item.task.id));
    
    const newItems: DailyPlanItem[] = [];
    const tasksToAdd: ExternalTask[] = [];

    taskIds.forEach((id) => {
      if (!existingTaskIds.has(id)) {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          tasksToAdd.push(task);
          newItems.push({
            id: `myday_${Date.now()}_${id}`,
            planDate: today,
            task,
            sortOrder: state.dailyPlanItems.length + newItems.length,
            completedLocally: false,
          });
        }
      }
    });

    if (tasksToAdd.length > 0) {
      DailyPlanRepository.addItemsToPlan(today, tasksToAdd);
    }

    set({
      dailyPlanItems: [...state.dailyPlanItems, ...newItems],
      selectedTaskIdsForMyDay: new Set<string>(),
      activeTab: 'my-day',
    });
  },

  removeFromMyDay: (taskId) => {
    const today = new Date().toISOString().split('T')[0];
    DailyPlanRepository.removeItemFromPlan(today, taskId);
    set((state) => ({
      dailyPlanItems: state.dailyPlanItems.filter((item) => item.task.id !== taskId),
    }));
  },

  toggleCompleteLocally: (taskId) => {
    const today = new Date().toISOString().split('T')[0];
    const currentItem = get().dailyPlanItems.find((i) => i.task.id === taskId);
    const nextCompleted = currentItem ? !currentItem.completedLocally : true;
    DailyPlanRepository.toggleCompleteLocally(today, taskId, nextCompleted);

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
  },

  reorderMyDay: (sourceIndex, destIndex) =>
    set((state) => {
      const items = [...state.dailyPlanItems];
      const [removed] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, removed);
      return {
        dailyPlanItems: items.map((item, idx) => ({ ...item, sortOrder: idx })),
      };
    }),

  updateTaskStatus: (taskId, newStatusName) => {
    TaskRepository.updateStatus(taskId, newStatusName);
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
