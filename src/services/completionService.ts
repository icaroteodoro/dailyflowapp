import { CompletionShortcut, ExternalTask } from '../types';
import { KeychainService } from './keychain';
import { ProviderFactory } from '../providers/ProviderFactory';
import { TaskRepository } from './taskRepository';
import { DailyPlanRepository } from './dailyPlanRepository';

export interface CompletionResult {
  success: boolean;
  message: string;
  updatedStatus: string;
  commentSent?: string;
  mentionedUser?: string;
}

export const CompletionService = {
  /**
   * Formata o template de comentário substituindo variáveis dinâmicas no local exato
   */
  formatComment(
    template: string,
    task: ExternalTask,
    shortcut: CompletionShortcut
  ): string {
    const memberName = shortcut.assigneeToMentionName || '';
    const taskTitle = task.title;
    const todayStr = new Date().toLocaleDateString('pt-BR');

    let text = template || 'Tarefa finalizada com sucesso! 🚀';

    const hasMemberTag =
      text.includes('@{member}') ||
      text.includes('{member}') ||
      (memberName ? text.includes(`@${memberName}`) : false);

    // Substituir tags no local exato onde foram inseridas
    if (memberName) {
      text = text.replace(/@{member}/gi, `@${memberName}`);
      text = text.replace(/{member}/gi, memberName);
    } else {
      text = text.replace(/@{member}/gi, '').replace(/{member}/gi, '');
    }

    text = text.replace(/{task}/gi, taskTitle);
    text = text.replace(/{date}/gi, todayStr);

    // Se o usuário selecionou um membro mas não usou tag no template, prefixar no início
    if (memberName && !hasMemberTag) {
      text = `@${memberName} ${text}`;
    }

    return text.trim();
  },

  /**
   * Executa a automação de finalização para uma determinada tarefa
   */
  async executeShortcut(
    task: ExternalTask,
    shortcut: CompletionShortcut
  ): Promise<CompletionResult> {
    const targetStatus = shortcut.targetStatus || 'COMPLETE';
    const commentToSend = this.formatComment(shortcut.commentTemplate, task, shortcut);
    const today = new Date().toISOString().split('T')[0];

    // 1. Atualização local persistente (SQLite)
    try {
      await TaskRepository.updateStatus(task.id, targetStatus);
      await DailyPlanRepository.toggleCompleteLocally(today, task.id, true);
    } catch (e) {
      console.warn('Erro ao atualizar SQLite localmente:', e);
    }

    // 2. Envio remoto ao Provedor (ClickUp)
    let remoteSuccess = false;
    let remoteError: string | null = null;

    try {
      const token = await KeychainService.getToken(`${task.provider}_api_token`);
      if (token) {
        const provider = ProviderFactory.getProvider(task.provider);
        
        // Disparar atualização de status no ClickUp
        await provider.updateTaskStatus(token, task.externalId, targetStatus);

        // Disparar comentário com menção formal no ClickUp
        if (commentToSend) {
          await provider.createComment(token, task.externalId, commentToSend, {
            notifyAssigneeId: shortcut.assigneeToMentionId,
            assigneeName: shortcut.assigneeToMentionName,
          });
        }
        remoteSuccess = true;
      }
    } catch (e: any) {
      console.warn('Não foi possível sincronizar com o ClickUp remotamente:', e);
      remoteError = e.message;
    }

    if (remoteSuccess) {
      return {
        success: true,
        message: `Tarefa finalizada! Status alterado para "${targetStatus}"${
          shortcut.assigneeToMentionName ? ` e @${shortcut.assigneeToMentionName} notificado` : ''
        }.`,
        updatedStatus: targetStatus,
        commentSent: commentToSend,
        mentionedUser: shortcut.assigneeToMentionName,
      };
    } else {
      return {
        success: true, // Localmente foi um sucesso
        message: `Tarefa finalizada localmente (${targetStatus}).${
          remoteError ? ' (Sincronização remota pendente/offline)' : ''
        }`,
        updatedStatus: targetStatus,
        commentSent: commentToSend,
        mentionedUser: shortcut.assigneeToMentionName,
      };
    }
  },
};
