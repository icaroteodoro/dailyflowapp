import { CompletionShortcut, ExternalTask } from '../types';
import { KeychainService } from './keychain';
import { ProviderFactory } from '../providers/ProviderFactory';

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
    let updatedStatus = task.status.name;
    try {
      if (!shortcut.isEnabled) throw new Error('Automação desativada.');
      if (!task.availableStatuses.some(status => status.name.toLowerCase() === targetStatus.toLowerCase())) {
        throw new Error('O status da automação não existe nesta lista. Revise as configurações.');
      }
      const token = await KeychainService.getToken(`${task.provider}_api_token`);
      if (!token) throw new Error('Conecte sua conta antes de executar a automação.');
      const provider = ProviderFactory.getProvider(task.provider);
      await provider.updateTaskStatus(token, task.externalId, targetStatus);
      updatedStatus = targetStatus;
      await provider.createComment(token, task.externalId, commentToSend, {
        notifyAssigneeId: shortcut.assigneeToMentionId,
        assigneeName: shortcut.assigneeToMentionName,
      });
      return { success: true, updatedStatus, message: 'Status atualizado e comentário enviado ao ClickUp.', commentSent: commentToSend };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, updatedStatus, message: updatedStatus !== task.status.name
        ? `Status atualizado, mas o comentário não foi confirmado. Confira o ClickUp antes de reenviar. ${message}`
        : `Automação não confirmada. Confira o ClickUp antes de tentar novamente. ${message}` };
    }
  },
};
