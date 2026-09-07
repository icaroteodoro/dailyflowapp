import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { initialTasks } from './services/mockTasks';
import { DrawerHandle } from './components/DrawerHandle';
import { Header } from './components/Header';
import { MyDayView } from './components/MyDayView';
import { AllTasksView } from './components/AllTasksView';
import { SettingsView } from './components/SettingsView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { QuickCreateTaskModal } from './components/QuickCreateTaskModal';

export const App: React.FC = () => {
  const {
    isExpanded,
    setIsExpanded,
    toggleExpanded,
    activeTab,
    setTasks,
    addToMyDay,
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    isQuickCreateOpen,
    setIsQuickCreateOpen,
    loadLocalData,
  } = useAppStore();

  // Initialize initial data on first render (SQLite local-first)
  useEffect(() => {
    async function init() {
      await loadLocalData();
      const state = useAppStore.getState();
      // Only load initial mock demonstration tasks if user has NO integration AND no tasks
      if (state.tasks.length === 0 && !state.integration) {
        setTasks(initialTasks);
        addToMyDay([initialTasks[0].id, initialTasks[2].id]);
      }
    }
    init();
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTaskForDetail) {
          setSelectedTaskForDetail(null);
        } else if (isQuickCreateOpen) {
          setIsQuickCreateOpen(false);
        } else if (isExpanded) {
          setIsExpanded(false);
        }
      }
      // Cmd + Shift + D or Ctrl + Shift + D to toggle drawer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleExpanded();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskForDetail, isQuickCreateOpen, isExpanded]);

  return (
    <div className="relative w-full h-full overflow-hidden flex justify-end bg-transparent select-none">
      {/* Retractable Lateral Drawer Handle (when collapsed) */}
      <DrawerHandle />

      {/* Main Drawer Container */}
      {isExpanded && (
        <div className="w-full h-full flex flex-col bg-[#0f172a] shadow-2xl border-l border-white/10 rounded-l-2xl overflow-hidden animate-in fade-in slide-in-from-right duration-200">
          {/* Header */}
          <Header />

          {/* Tab Content Views */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#0f172a]">
            {activeTab === 'my-day' && <MyDayView />}
            {activeTab === 'all-tasks' && <AllTasksView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          {/* Modals & Drawers */}
          <TaskDetailModal />
          <QuickCreateTaskModal />
        </div>
      )}
    </div>
  );
};

export default App;
