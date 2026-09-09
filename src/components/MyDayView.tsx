import React from 'react';
import {
  Sun,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  PlusCircle,
  Layers,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const MyDayView: React.FC = () => {
  const {
    dailyPlanItems,
    toggleCompleteLocally,
    removeFromMyDay,
    setSelectedTaskForDetail,
    setActiveTab,
    completionShortcut,
    executeCompletionShortcut,
  } = useAppStore();

  const total = dailyPlanItems.length;
  const completed = dailyPlanItems.filter((i) => i.completedLocally).length;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (dailyPlanItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Sun className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">
          Nenhuma tarefa no seu dia ainda
        </h3>
        <p className="text-xs text-zinc-400 max-w-xs mb-5">
          Selecione tarefas da sua lista geral do ClickUp ou crie uma nova para focar hoje.
        </p>
        <button
          onClick={() => setActiveTab('all-tasks')}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2 px-4 rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Adicionar tarefas ao Meu Dia</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 select-none">
      {/* Progress Bar */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
          <span>Progresso do dia</span>
          <span className="text-amber-300 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {dailyPlanItems.map((item) => {
          const { task, completedLocally } = item;
          return (
            <div
              key={item.id}
              className={`group flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                completedLocally
                  ? 'bg-zinc-950/40 border-white/5 opacity-60'
                  : 'bg-zinc-900/70 hover:bg-zinc-900 border-white/10 hover:border-white/20 shadow-sm'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompleteLocally(task.id);
                }}
                className="mt-0.5 text-zinc-400 hover:text-emerald-400 transition-colors focus:outline-none"
              >
                {item.completedLocally ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              {/* Task Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedTaskForDetail(task)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-xs font-semibold leading-snug break-words transition-colors ${
                      item.completedLocally
                        ? 'line-through text-zinc-500'
                        : 'text-zinc-200 group-hover:text-white'
                    }`}
                  >
                    {task.title}
                  </h4>
                </div>

                {/* Badges / Metadata */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {/* Status Badge */}
                  <span
                    className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10"
                    style={{
                      backgroundColor: `${task.status.color || '#71717a'}20`,
                      color: task.status.color || '#a1a1aa',
                    }}
                  >
                    {task.status.name}
                  </span>

                  {/* List / Source */}
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                    <Layers className="w-2.5 h-2.5 text-zinc-500" />
                    <span className="truncate max-w-[120px]">{task.sourceName}</span>
                  </span>

                  {/* Due Date */}
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                      <Clock className="w-2.5 h-2.5 text-zinc-500" />
                      <span>{task.dueDate}</span>
                    </span>
                  )}

                  {/* Assignees */}
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex items-center -space-x-1 ml-auto">
                      {task.assignees.map((assignee) =>
                        assignee.avatarUrl ? (
                          <img
                            key={assignee.id}
                            src={assignee.avatarUrl}
                            alt={assignee.username}
                            title={assignee.username}
                            className="w-4 h-4 rounded-full border border-zinc-900 object-cover"
                          />
                        ) : (
                          <div
                            key={assignee.id}
                            title={assignee.username}
                            className="w-4 h-4 rounded-full text-[8px] font-bold text-zinc-950 bg-zinc-200 flex items-center justify-center border border-zinc-900"
                          >
                            {assignee.username.substring(0, 1).toUpperCase()}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* ⚡ Quick Completion Shortcut Button (Semantic: Orange) */}
                {completionShortcut && completionShortcut.isEnabled && (
                  <button
                    type="button"
                    title={`Finalizar no ClickUp: ${completionShortcut.name || 'Atalho'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      executeCompletionShortcut(task.id);
                    }}
                    className="p-1 rounded bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-zinc-950 transition-all border border-orange-500/30 active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => removeFromMyDay(task.id)}
                  title="Remover do Meu Dia"
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
