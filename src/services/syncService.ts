import { KeychainService } from './keychain';
import { SettingsRepository } from './settingsRepository';
import { TaskRepository } from './taskRepository';
import { ProviderFactory } from '../providers/ProviderFactory';
import { useAppStore } from '../store/useAppStore';

let running: Promise<{success: boolean; count: number; error?: string}> | null = null;
export const SyncService = {
  syncNow(): Promise<{success: boolean; count: number; error?: string}> {
    if (running) return running;
    running = this.performSync().finally(() => { running = null; });
    return running;
  },
  async performSync(): Promise<{success: boolean; count: number; error?: string}> {
    const store = useAppStore.getState();
    const integration = store.integration;
    if (!integration?.isActive) return {success: false, count: 0, error: 'Conecte uma integração nas configurações.'};
    store.setSyncing(true);
    try {
      const token = await KeychainService.getToken(`${integration.provider}_api_token`);
      if (!token) throw new Error('Token não encontrado. Reconecte sua conta nas configurações.');
      const provider = ProviderFactory.getProvider(integration.provider);
      const sources = await provider.getSources(token, integration.selectedWorkspaceIds);
      const selected = sources.filter(source => integration.selectedSourceIds.includes(source.id));
      if (!selected.length) throw new Error('Nenhuma lista selecionada está disponível. Revise as configurações.');
      const tasks = await provider.fetchTasks(token, selected, integration);
      // Discard responses from a connection that was changed or disconnected during the request.
      if (useAppStore.getState().integration !== integration) return {success: false, count: 0};
      await TaskRepository.upsertTasks(tasks);
      await TaskRepository.saveVisibleIds(tasks.map(task => task.id));
      const updated = {...integration, lastSyncAt: new Date().toISOString()};
      await SettingsRepository.saveIntegration(updated);
      store.setAvailableSources(sources);
      store.setTasks(tasks);
      store.setIntegration(updated);
      store.setLastSyncTime(updated.lastSyncAt);
      return {success: true, count: tasks.length};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.showToast({type: 'warning', title: 'Sincronização não concluída', message: `${message} Os dados locais foram mantidos.`});
      return {success: false, count: 0, error: message};
    } finally { store.setSyncing(false); }
  },
};
