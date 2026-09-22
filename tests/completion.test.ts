import { beforeEach, expect, it, vi } from 'vitest';
import { CompletionService } from '../src/services/completionService';
import { task } from './fixtures';
const provider = vi.hoisted(() => ({updateTaskStatus: vi.fn(), createComment: vi.fn()}));
vi.mock('../src/services/keychain', () => ({KeychainService: {getToken: async () => 'token'}}));
vi.mock('../src/providers/ProviderFactory', () => ({ProviderFactory: {getProvider: () => provider}}));
const shortcut = {id:'shortcut', name:'Finalizar', targetStatus:'DONE', commentTemplate:'Pronto', isEnabled:true};
beforeEach(() => vi.resetAllMocks());
it('reports a remote status failure without claiming completion', async () => {
  provider.updateTaskStatus.mockRejectedValue(new Error('offline'));
  const result = await CompletionService.executeShortcut(task, shortcut);
  expect(result.success).toBe(false);
  expect(result.updatedStatus).toBe('OPEN');
  expect(result.commentSent).toBeUndefined();
  expect(provider.createComment).not.toHaveBeenCalled();
});
it('reports partial success if status changed but comment failed', async () => {
  provider.createComment.mockRejectedValue(new Error('offline'));
  const result = await CompletionService.executeShortcut(task, shortcut);
  expect(result.success).toBe(false);
  expect(result.updatedStatus).toBe('DONE');
  expect(result.commentSent).toBeUndefined();
  expect(result.message).toContain('comentário não foi confirmado');
});
it('rejects statuses unavailable on the task list', async () => {
  const result = await CompletionService.executeShortcut(task, {...shortcut, targetStatus:'INVALID'});
  expect(result.success).toBe(false);
  expect(provider.updateTaskStatus).not.toHaveBeenCalled();
});
