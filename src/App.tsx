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
import { Zap, CheckCircle2, AlertTriangle, X } from 'lucide-react';

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
    toast,
    hideToast,
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
        <div className="w-full h-full flex flex-col bg-[#09090b] shadow-2xl border-l border-white/10 rounded-l-2xl overflow-hidden animate-in fade-in slide-in-from-right duration-200 relative">
          {/* Header */}
          <Header />

          {/* Tab Content Views */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
            {activeTab === 'my-day' && <MyDayView />}
            {activeTab === 'all-tasks' && <AllTasksView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          {/* Toast Notification Banner */}
          {toast && (
            <div className="absolute top-16 left-3 right-3 z-50 animate-in slide-in-from-top duration-200">
              <div
                className={`p-3 rounded-xl border shadow-xl flex items-start gap-2.5 backdrop-blur-md ${
                  toast.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                    : toast.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                    : 'bg-zinc-900 border-white/20 text-zinc-100'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {toast.type === 'success' ? (
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ) : toast.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
                  {toast.message && (
                    <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={hideToast}
                  className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Modals & Drawers */}
          <TaskDetailModal />
          <QuickCreateTaskModal />
        </div>
      )}
    </div>
  );
};

export default App;

