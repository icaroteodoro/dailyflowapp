import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuickCreateTaskModal } from '../src/components/QuickCreateTaskModal';
import { TaskDetailModal } from '../src/components/TaskDetailModal';
import { useAppStore } from '../src/store/useAppStore';
import { task, source, integration } from './fixtures';
const provider = vi.hoisted(() => ({createTask: vi.fn(), createComment: vi.fn()}));
vi.mock('../src/services/keychain', () => ({KeychainService: {getToken: async () => 'token'}}));
vi.mock('../src/providers/ProviderFactory', () => ({ProviderFactory: {getProvider: () => provider}}));
beforeEach(() => {
  vi.resetAllMocks();
  useAppStore.setState({integration, availableSources:[source], tasks:[], isQuickCreateOpen:true, selectedTaskForDetail: task, completionShortcut:null, dailyPlanItems:[], toast:null});
});
afterEach(cleanup);
it('offers configured empty lists and keeps the form on remote creation failure', async () => {
  provider.createTask.mockRejectedValue(new Error('offline'));
  render(<QuickCreateTaskModal />);
  expect(screen.getByRole('combobox').textContent).toContain('Lista vazia');
  fireEvent.change(screen.getByPlaceholderText('Ex: Implementar tela de login'), {target:{value:'Nova tarefa'}});
  fireEvent.click(screen.getByRole('button', {name:'Criar Tarefa'}));
  await waitFor(() => expect(useAppStore.getState().toast?.type).toBe('error'));
  expect(provider.createTask).toHaveBeenCalledWith('token', expect.objectContaining({listId: source.id}));
  expect(useAppStore.getState().tasks).toEqual([]);
  expect(useAppStore.getState().isQuickCreateOpen).toBe(true);
});
it('retains an unsent comment and never displays it as sent', async () => {
  provider.createComment.mockRejectedValue(new Error('offline'));
  const {container} = render(<TaskDetailModal />);
  const input = screen.getByPlaceholderText('Escrever comentário...') as HTMLInputElement;
  fireEvent.change(input, {target:{value:'Comentário de teste'}});
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(useAppStore.getState().toast?.type).toBe('error'));
  expect(input.value).toBe('Comentário de teste');
  expect(screen.queryByText('Você')).toBeNull();
});
