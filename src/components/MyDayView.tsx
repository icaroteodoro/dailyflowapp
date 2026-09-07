import React from 'react';
import {
  Sun,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const MyDayView: React.FC = () => {
  const {
    dailyPlanItems,
    toggleCompleteLocally,
    removeFromMyDay,
    setSelectedTaskForDetail,
    setActiveTab,
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
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Seu dia está limpo!
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          Selecione as tarefas pendentes do ClickUp que você planeja focar e executar hoje.
        </p>
        <button
          onClick={() => setActiveTab('all-tasks')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-lg transition-all active:scale-95"
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
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>Progresso do dia</span>
          <span className="text-slate-200 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 ease-out rounded-full"
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
                  ? 'bg-slate-900/40 border-white/5 opacity-60'
                  : 'bg-slate-800/70 hover:bg-slate-800 border-white/10 hover:border-white/20 shadow-sm'
              }`}
            >
              {/* Local Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompleteLocally(task.id);
                }}
                className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors focus:outline-none"
                title={completedLocally ? 'Desmarcar' : 'Concluir no Meu Dia'}
              >
                {completedLocally ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              {/* Task Content */}
              <div
                className="flex-1 min-w-0"
                onClick={() => setSelectedTaskForDetail(task)}
              >
                <p
                  className={`text-xs font-medium leading-snug break-words ${
                    completedLocally
                      ? 'line-through text-slate-500'
                      : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {task.title}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Status Badge */}
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

                  {/* List / Source Name */}
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-white/5">
                    <Layers className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[110px]">{task.sourceName}</span>
                  </span>

                  {/* Due Date */}
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{task.dueDate}</span>
                    </span>
                  )}

                  {/* Assignees */}
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
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromMyDay(task.id);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
                  title="Remover do Meu Dia"
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
