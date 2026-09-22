import React, { useState } from 'react';
import { X, Plus, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { TaskRepository } from '../services/taskRepository';
import { KeychainService } from '../services/keychain';
import { ProviderFactory } from '../providers/ProviderFactory';

export const QuickCreateTaskModal: React.FC = () => {
  const { isQuickCreateOpen, setIsQuickCreateOpen, integration, availableSources: sources, setTasks, addToMyDay, showToast } = useAppStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [addImmediatelyToMyDay, setAddImmediatelyToMyDay] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isQuickCreateOpen) return null;

  const availableSources = sources.filter(source => integration?.selectedSourceIds.includes(source.id));
  const sourceId = availableSources.some(source => source.id === selectedSource) ? selectedSource : availableSources[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting || !integration || !sourceId) return;
    setIsSubmitting(true);
    let created = false;
    try {
      const token = await KeychainService.getToken(`${integration.provider}_api_token`);
      if (!token) throw new Error('Reconecte sua conta nas configurações.');
      const source = availableSources.find(source => source.id === sourceId)!;
      const provider = ProviderFactory.getProvider(integration.provider);
      const task = await provider.createTask(token, {listId: sourceId, title: title.trim(), description: description.trim() || undefined, dueDate: dueDate || undefined});
      created = true;
      const createdTask = {...task, workspaceId: source.workspaceId, workspaceName: source.workspaceName,
        spaceId: source.spaceId, spaceName: source.spaceName, folderId: source.folderId, folderName: source.folderName,
        availableStatuses: source.statuses || [task.status]};
      await TaskRepository.upsertTasks([createdTask]);
      const tasks = [createdTask, ...useAppStore.getState().tasks.filter(t => t.id !== task.id)];
      await TaskRepository.saveVisibleIds(tasks.map(task => task.id));
      setTasks(tasks);
      if (addImmediatelyToMyDay) await addToMyDay([createdTask.id]);
      setIsQuickCreateOpen(false);
      setTitle(''); setDescription(''); setDueDate('');
      showToast({type: 'success', title: 'Tarefa criada no ClickUp'});
    } catch (error) {
      if (created) setIsQuickCreateOpen(false);
      showToast({type: 'error', title: created ? 'Tarefa criada, mas falhou ao salvar localmente. Sincronize novamente.' : 'Criação não confirmada. Confira o ClickUp antes de tentar novamente.', message: String(error)});
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div
        className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-zinc-800 text-zinc-200">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-semibold text-zinc-100">Criar Nova Tarefa</h2>
          </div>
          <button
            onClick={() => setIsQuickCreateOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {!sourceId && <p className="text-xs text-amber-300">Conecte sua conta e selecione listas nas configurações.</p>}
          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Título da tarefa *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Implementar tela de login"
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Lista de destino (ClickUp)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer"
            >
              {availableSources.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900">
                  {[s.workspaceName, s.spaceName, s.folderName, s.name].filter(Boolean).join(' › ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Descrição (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes rápidos..."
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Prazo (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addToMyDayCheck"
              checked={addImmediatelyToMyDay}
              onChange={(e) => setAddImmediatelyToMyDay(e.target.checked)}
              className="rounded bg-zinc-950 border-white/20 text-zinc-200 focus:ring-0 cursor-pointer accent-zinc-200"
            />
            <label htmlFor="addToMyDayCheck" className="text-xs text-zinc-300 cursor-pointer">
              Adicionar diretamente ao <strong>Meu Dia</strong>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !sourceId || !integration}
              className="px-4 py-1.5 bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
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
