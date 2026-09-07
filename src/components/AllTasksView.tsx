import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Sun,
  Layers,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SyncService } from '../services/syncService';

export const AllTasksView: React.FC = () => {
  const {
    tasks,
    searchQuery,
    setSearchQuery,
    selectedTaskIdsForMyDay,
    toggleSelectTaskForMyDay,
    addToMyDay,
    dailyPlanItems,
    setSelectedTaskForDetail,
    clearSelectedTaskIds,
    isSyncing,
    setActiveTab,
  } = useAppStore();

  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');

  const myDayTaskIds = new Set(dailyPlanItems.map((item) => item.task.id));

  // Extract all unique status names from tasks
  const availableStatusNames = Array.from(
    new Set(tasks.map((t) => t.status.name.toUpperCase()))
  );

  // Filter tasks based on search & status filter
  const filteredTasks = tasks.filter((task) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      task.title.toLowerCase().includes(q) ||
      task.sourceName.toLowerCase().includes(q) ||
      (task.workspaceName && task.workspaceName.toLowerCase().includes(q)) ||
      (task.spaceName && task.spaceName.toLowerCase().includes(q)) ||
      (task.folderName && task.folderName.toLowerCase().includes(q));

    const matchesStatus =
      activeStatusFilter === 'ALL' ||
      task.status.name.toUpperCase() === activeStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group by full hierarchy: Workspace › Espaço › Pasta › Lista
  const groupedTasks = filteredTasks.reduce<
    Record<
      string,
      {
        workspaceName?: string;
        spaceName?: string;
        folderName?: string;
        sourceName: string;
        tasks: typeof tasks;
      }
    >
  >((acc, task) => {
    const parts = [
      task.workspaceName,
      task.spaceName,
      task.folderName,
      task.sourceName,
    ].filter(Boolean);
    const key = parts.length > 0 ? parts.join(' › ') : task.sourceName;

    if (!acc[key]) {
      acc[key] = {
        workspaceName: task.workspaceName,
        spaceName: task.spaceName,
        folderName: task.folderName,
        sourceName: task.sourceName,
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  const selectedCount = selectedTaskIdsForMyDay.size;

  const handleAddSelected = () => {
    if (selectedCount > 0) {
      addToMyDay(Array.from(selectedTaskIdsForMyDay));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 select-none">
      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tarefas, listas ou espaços..."
          className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Status Filter Chips */}
      {availableStatusNames.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveStatusFilter('ALL')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0 ${
              activeStatusFilter === 'ALL'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
            }`}
          >
            Todos ({tasks.length})
          </button>

          {availableStatusNames.map((st) => {
            const count = tasks.filter((t) => t.status.name.toUpperCase() === st).length;
            const isSelected = activeStatusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setActiveStatusFilter(st)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Task List grouped */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
            <p className="text-xs">Nenhuma tarefa encontrada para os filtros aplicados.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => SyncService.syncNow()}
                disabled={isSyncing}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar tarefas agora</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl transition-all"
              >
                Ajustar listas
              </button>
            </div>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([groupKey, group]) => (
            <div key={groupKey} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-1 flex-wrap">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {group.workspaceName && (
                  <>
                    <span className="text-purple-400 font-bold">{group.workspaceName}</span>
                    <span className="text-slate-600">›</span>
                  </>
                )}
                {group.spaceName && (
                  <>
                    <span className="text-slate-300 font-medium">{group.spaceName}</span>
                    <span className="text-slate-600">›</span>
                  </>
                )}
                {group.folderName && (
                  <>
                    <span className="text-slate-400 font-medium">{group.folderName}</span>
                    <span className="text-slate-600">›</span>
                  </>
                )}
                <span className="text-blue-300 font-bold">{group.sourceName}</span>
                <span className="text-slate-500 font-normal">({group.tasks.length})</span>
              </div>

              <div className="space-y-1.5">
                {group.tasks.map((task) => {
                  const isSelected = selectedTaskIdsForMyDay.has(task.id);
                  const isAlreadyInMyDay = myDayTaskIds.has(task.id);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskForDetail(task)}
                      className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/30'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAlreadyInMyDay) {
                            toggleSelectTaskForMyDay(task.id);
                          }
                        }}
                        disabled={isAlreadyInMyDay}
                        className={`mt-0.5 transition-colors focus:outline-none ${
                          isAlreadyInMyDay
                            ? 'text-amber-400/60 cursor-default'
                            : isSelected
                            ? 'text-blue-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={
                          isAlreadyInMyDay
                            ? 'Já está no Meu Dia'
                            : isSelected
                            ? 'Desmarcar'
                            : 'Selecionar para o Meu Dia'
                        }
                      >
                        {isAlreadyInMyDay ? (
                          <Sun className="w-4 h-4 fill-amber-400/20" />
                        ) : isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 group-hover:text-white leading-snug">
                          {task.title}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: `${task.status.color || '#64748b'}20`,
                              borderColor: `${task.status.color || '#64748b'}40`,
                              color: task.status.color || '#94a3b8',
                            }}
                          >
                            {task.status.name}
                          </span>

                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-white/5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{task.dueDate}</span>
                            </span>
                          )}

                          {task.assignees && task.assignees.length > 0 && (
                            <div className="flex items-center -space-x-1" title={`Responsável: ${task.assignees.map((a) => a.username).join(', ')}`}>
                              {task.assignees.map((a) =>
                                a.avatarUrl ? (
                                  <img
                                    key={a.id}
                                    src={a.avatarUrl}
                                    alt={a.username}
                                    className="w-4 h-4 rounded-full border border-slate-900 object-cover"
                                  />
                                ) : (
                                  <div
                                    key={a.id}
                                    className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center border border-slate-900"
                                    style={{ backgroundColor: a.color || '#3b82f6' }}
                                  >
                                    {a.username.substring(0, 1).toUpperCase()}
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {isAlreadyInMyDay && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Sun className="w-2.5 h-2.5" />
                              <span>No Meu Dia</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Bottom Action Bar */}
      {selectedCount > 0 && (
        <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between gap-2 bg-slate-900/90 rounded-xl p-2">
          <span className="text-xs text-slate-300 font-medium pl-1">
            {selectedCount} {selectedCount === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={clearSelectedTaskIds}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddSelected}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md transition-all active:scale-95"
            >
              <Sun className="w-3.5 h-3.5 fill-slate-950" />
              <span>Adicionar ao Meu Dia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
