import React, { useState } from 'react';
import { X, Plus, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ExternalTask } from '../types';
import { KeychainService } from '../services/keychain';
import { ProviderFactory } from '../providers/ProviderFactory';

export const QuickCreateTaskModal: React.FC = () => {
  const { isQuickCreateOpen, setIsQuickCreateOpen, tasks, setTasks, addToMyDay } = useAppStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState('Sprint 14');
  const [dueDate, setDueDate] = useState('');
  const [addImmediatelyToMyDay, setAddImmediatelyToMyDay] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isQuickCreateOpen) return null;

  // Extract unique source names
  const availableSources = Array.from(new Set(tasks.map((t) => t.sourceName)));
  if (availableSources.length === 0) {
    availableSources.push('Sprint 14', 'Backlog Produto', 'Bugs Críticos');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    let createdTask: ExternalTask | null = null;

    try {
      const token = await KeychainService.getToken('clickup_api_token');
      if (token) {
        const provider = ProviderFactory.getProvider('clickup');
        // Find matching source id if available
        const matchingTask = tasks.find((t) => t.sourceName === selectedSource);
        const listId = matchingTask?.sourceId || 'list_1';

        createdTask = await provider.createTask(token, {
          listId,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate.trim() || undefined,
        });
      }
    } catch (err) {
      console.warn('Could not create on ClickUp API directly, creating in local cache:', err);
    }

    if (!createdTask) {
      createdTask = {
        id: `task_${Date.now()}`,
        externalId: `${Date.now()}`,
        provider: 'clickup',
        title: title.trim(),
        description: description.trim() || undefined,
        status: {
          id: 'to_do',
          name: 'TO DO',
          color: '#87909e',
          isDone: false,
        },
        availableStatuses: [
          { id: 'to_do', name: 'TO DO', color: '#87909e' },
          { id: 'in_progress', name: 'IN PROGRESS', color: '#3b82f6' },
          { id: 'done', name: 'DONE', color: '#10b981', isDone: true },
        ],
        sourceId: 'list_1',
        sourceName: selectedSource,
        dueDate: dueDate || undefined,
        url: 'https://app.clickup.com',
        updatedAt: new Date().toISOString(),
      };
    }

    setTasks([createdTask, ...tasks]);
    if (addImmediatelyToMyDay) {
      addToMyDay([createdTask.id]);
    }

    setIsSubmitting(false);
    setIsQuickCreateOpen(false);
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-semibold text-slate-100">Criar Nova Tarefa</h2>
          </div>
          <button
            onClick={() => setIsQuickCreateOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Título da tarefa *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Implementar tela de login"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Lista de destino (ClickUp)
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {availableSources.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Descrição (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes rápidos..."
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Prazo (opcional)
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="Ex: Hoje, Amanhã, 18:00"
              className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addToMyDayCheck"
              checked={addImmediatelyToMyDay}
              onChange={(e) => setAddImmediatelyToMyDay(e.target.checked)}
              className="rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="addToMyDayCheck" className="text-xs text-slate-300 cursor-pointer">
              Adicionar diretamente ao <strong>Meu Dia</strong>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Criando...' : 'Criar Tarefa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
