import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Sun,
  Layers,
  Clock,
  RefreshCw,
  Zap,
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
    completionShortcut,
    executeCompletionShortcut,
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tarefas, listas ou espaços..."
          className="w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400/60 focus:ring-1 focus:ring-zinc-400/30 transition-all"
        />
      </div>

      {/* Status Filter Chips */}
      {availableStatusNames.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveStatusFilter('ALL')}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
              activeStatusFilter === 'ALL'
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-bold shadow-xs'
                : 'bg-zinc-900/80 text-zinc-400 border-white/5 hover:text-zinc-200'
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
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-200 font-bold shadow-xs'
                    : 'bg-zinc-900/80 text-zinc-400 border-white/5 hover:text-zinc-200'
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
          <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400 gap-3">
            <p className="text-xs">Nenhuma tarefa encontrada para os filtros aplicados.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => SyncService.syncNow()}
                disabled={isSyncing}
                className="text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar tarefas agora</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Ajustar listas
              </button>
            </div>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([groupKey, group]) => (
            <div key={groupKey} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-1 flex-wrap">
                <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                {group.workspaceName && (
                  <>
                    <span className="text-zinc-200 font-bold">{group.workspaceName}</span>
                    <span className="text-zinc-600">›</span>
                  </>
                )}
                {group.spaceName && (
                  <>
                    <span className="text-zinc-300 font-medium">{group.spaceName}</span>
                    <span className="text-zinc-600">›</span>
                  </>
                )}
                {group.folderName && (
                  <>
                    <span className="text-zinc-400 font-medium">{group.folderName}</span>
                    <span className="text-zinc-600">›</span>
                  </>
                )}
                <span className="text-zinc-100 font-bold">{group.sourceName}</span>
                <span className="text-zinc-500 font-normal">({group.tasks.length})</span>
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
                          ? 'bg-zinc-800/80 border-white/20'
                          : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/5 hover:border-white/15'
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
                            ? 'text-amber-400/70 cursor-default'
                            : isSelected
                            ? 'text-amber-400'
                            : 'text-zinc-500 hover:text-zinc-300'
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
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-white leading-snug">
                          {task.title}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10"
                            style={{
                              backgroundColor: `${task.status.color || '#71717a'}20`,
                              color: task.status.color || '#a1a1aa',
                            }}
                          >
                            {task.status.name}
                          </span>

                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                              <Clock className="w-2.5 h-2.5 text-zinc-500" />
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
                                    className="w-4 h-4 rounded-full border border-zinc-900 object-cover"
                                  />
                                ) : (
                                  <div
                                    key={a.id}
                                    className="w-4 h-4 rounded-full text-[8px] font-bold text-zinc-950 bg-zinc-200 flex items-center justify-center border border-zinc-900"
                                  >
                                    {a.username.substring(0, 1).toUpperCase()}
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {isAlreadyInMyDay && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                              <Sun className="w-2.5 h-2.5 text-amber-400" />
                              <span>No Meu Dia</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Automation Complete Button (Semantic: Orange) */}
                      {(!completionShortcut || completionShortcut.isEnabled) && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeCompletionShortcut(task.id);
                            }}
                            className="p-1 rounded bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-zinc-950 transition-all border border-orange-500/30 active:scale-95 cursor-pointer shadow-xs"
                            title={`Finalizar com Atalho ClickUp ⚡ (Status: ${completionShortcut?.targetStatus || 'COMPLETE'}${
                              completionShortcut?.assigneeToMentionName ? ` | Notificar: @${completionShortcut.assigneeToMentionName}` : ''
                            })`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
        <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between gap-2 bg-zinc-900 border border-white/10 rounded-xl p-2 shadow-xl">
          <span className="text-xs text-zinc-300 font-medium pl-1">
            {selectedCount} {selectedCount === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={clearSelectedTaskIds}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddSelected}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Sun className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Adicionar ao Meu Dia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
