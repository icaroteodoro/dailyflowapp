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
    <header className="border-b border-white/10 bg-zinc-900/90 backdrop-blur-xl p-3.5 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100 capitalize">
            {todayFormatted}
          </h1>
          {totalCount > 0 && (
            <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-white/5 font-medium">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsQuickCreateOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 transition-all shadow-sm active:scale-95 cursor-pointer font-bold"
            title="Criar nova tarefa rápida"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer ${
              isSyncing ? 'animate-spin text-zinc-200' : ''
            }`}
            title={lastSyncTime ? `Última sincronização às ${lastSyncTime}` : 'Sincronizar agora'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
            title="Recolher para a lateral"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('my-day')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'my-day'
              ? 'bg-zinc-800 text-amber-300 shadow-sm border border-white/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Meu Dia</span>
        </button>

        <button
          onClick={() => setActiveTab('all-tasks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'all-tasks'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5 text-zinc-300" />
          <span>Tarefas</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center justify-center py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          }`}
          title="Configurações"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </nav>
    </header>
  );
};
