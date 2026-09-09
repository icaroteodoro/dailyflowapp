import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Sun,
  Layers,
  Clock,
  Send,
  MessageSquare,
  Check,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { KeychainService } from '../services/keychain';
import { ProviderFactory } from '../providers/ProviderFactory';
import { openUrl } from '@tauri-apps/plugin-opener';

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    updateTaskStatus,
    dailyPlanItems,
    addToMyDay,
    removeFromMyDay,
    completionShortcut,
    executeCompletionShortcut,
  } = useAppStore();

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<
    Array<{ id: string; text: string; author: string; time: string }>
  >([]);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  if (!selectedTaskForDetail) return null;

  const task = selectedTaskForDetail;
  const isAlreadyInMyDay = dailyPlanItems.some((item) => item.task.id === task.id);

  const handleOpenExternal = async () => {
    try {
      if (task.url) {
        await openUrl(task.url);
      }
    } catch {
      window.open(task.url, '_blank');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    updateTaskStatus(task.id, newStatus);
    try {
      const token = await KeychainService.getToken(`${task.provider}_api_token`);
      if (token) {
        const provider = ProviderFactory.getProvider(task.provider);
        await provider.updateTaskStatus(token, task.externalId, newStatus);
      }
    } catch (e) {
      console.warn('Could not sync status remotely, updated locally:', e);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSendingComment(true);
    const textToSend = commentText.trim();

    try {
      const token = await KeychainService.getToken(`${task.provider}_api_token`);
      if (token) {
        const provider = ProviderFactory.getProvider(task.provider);
        await provider.createComment(token, task.externalId, textToSend);
      }
    } catch (e) {
      console.warn('Could not send comment to remote API, recorded in session:', e);
    }

    setComments((prev) => [
      ...prev,
      {
        id: `comment_${Date.now()}`,
        text: textToSend,
        author: 'Você',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCommentText('');
    setIsSendingComment(false);
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-h-[85vh] bg-zinc-900 border-t border-x border-white/10 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-zinc-400" />
              {task.sourceName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Abrir no ClickUp"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTaskForDetail(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Status and Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-400 font-medium">Status:</label>
              <select
                value={task.status.name}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-zinc-950/90 border border-white/10 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-zinc-400 cursor-pointer"
                style={{ color: task.status.color || '#a1a1aa' }}
              >
                {task.availableStatuses.map((s) => (
                  <option key={s.id} value={s.name} className="bg-zinc-900 text-zinc-200">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Complete with Automation Button (Semantic: Orange) */}
              {(!completionShortcut || completionShortcut.isEnabled) && (
                <button
                  onClick={async () => {
                    await executeCompletionShortcut(task.id);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 bg-orange-500 hover:bg-orange-400 border border-orange-400 px-3 py-1 rounded-lg transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
                  title={`Finalizar com status ${completionShortcut?.targetStatus || 'COMPLETE'}${
                    completionShortcut?.assigneeToMentionName ? ` e notificar @${completionShortcut.assigneeToMentionName}` : ''
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>
                    Finalizar com Atalho ⚡
                    {completionShortcut?.assigneeToMentionName && (
                      <span className="opacity-80 ml-1 text-[10px] font-normal">
                        (@{completionShortcut.assigneeToMentionName})
                      </span>
                    )}
                  </span>
                </button>
              )}

              {/* My Day Toggle Button (Semantic: Amber / Rose) */}
              {isAlreadyInMyDay ? (
                <button
                  onClick={() => removeFromMyDay(task.id)}
                  className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover do Meu Dia</span>
                </button>
              ) : (
                <button
                  onClick={() => addToMyDay([task.id])}
                  className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>Adicionar ao Meu Dia</span>
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium">Descrição</span>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {task.description || 'Sem descrição cadastrada nesta tarefa.'}
            </p>
          </div>

          {/* Due date if exists */}
          {task.dueDate && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Prazo de entrega: <strong className="text-zinc-200">{task.dueDate}</strong></span>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>Comentários</span>
            </div>

            {/* Comments List */}
            {comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">{c.author}</span>
                      <span>{c.time}</span>
                    </div>
                    <p className="text-zinc-200">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escrever comentário..."
                className="flex-1 bg-zinc-950/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={isSendingComment || !commentText.trim()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                {commentSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
