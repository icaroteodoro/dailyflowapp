import React from 'react';
import {
  Sun,
  ListTodo,
  Settings,
  RefreshCw,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SyncService } from '../services/syncService';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSyncing,
    lastSyncTime,
    setIsExpanded,
    setIsQuickCreateOpen,
    dailyPlanItems,
  } = useAppStore();

  const handleSync = async () => {
    if (isSyncing) return;
    await SyncService.syncNow();
  };

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const completedCount = dailyPlanItems.filter((i) => i.completedLocally).length;
  const totalCount = dailyPlanItems.length;

  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl p-3.5 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide text-slate-100 capitalize">
            {todayFormatted}
          </h1>
          {totalCount > 0 && (
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-white/5">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsQuickCreateOpen(true)}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm active:scale-95"
            title="Criar nova tarefa rápida"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all ${
              isSyncing ? 'animate-spin text-blue-400' : ''
            }`}
            title={lastSyncTime ? `Última sincronização às ${lastSyncTime}` : 'Sincronizar agora'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
            title="Recolher para a lateral"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('my-day')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'my-day'
              ? 'bg-slate-800 text-amber-300 shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Meu Dia</span>
        </button>

        <button
          onClick={() => setActiveTab('all-tasks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'all-tasks'
              ? 'bg-slate-800 text-blue-300 shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5 text-blue-400" />
          <span>Tarefas</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center justify-center py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-slate-800 text-slate-200 shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
          title="Configurações"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </nav>
    </header>
  );
};
