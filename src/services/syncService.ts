import { KeychainService } from './keychain';
import { SettingsRepository } from './settingsRepository';
import { TaskRepository } from './taskRepository';
import { ProviderFactory } from '../providers/ProviderFactory';
import { useAppStore } from '../store/useAppStore';

export const SyncService = {
  /**
   * Executa a sincronização rigorosa com base em Workspace -> Listas -> Status
   */
  async syncNow(): Promise<{ success: boolean; count: number; error?: string }> {
    const store = useAppStore.getState();
    store.setSyncing(true);

    try {
      const integration = store.integration || (await SettingsRepository.getIntegration());
      if (!integration || !integration.isActive) {
        store.setSyncing(false);
        return { success: false, count: 0, error: 'Nenhuma integração ativa configurada.' };
      }

      const token = await KeychainService.getToken(`${integration.provider}_api_token`);
      if (!token) {
        store.setSyncing(false);
        return { success: false, count: 0, error: 'Token de autenticação não encontrado no Keychain.' };
      }

      const provider = ProviderFactory.getProvider(integration.provider);

      // Load/ensure sources for the selected workspace(s)
      let allSources = store.availableSources;
      if (allSources.length === 0) {
        allSources = await provider.getSources(token, integration.selectedWorkspaceIds);
        store.setAvailableSources(allSources);
      }

      // Filter to only the sources the user explicitly selected
      const selectedSources = allSources.filter((s) =>
        integration.selectedSourceIds.includes(s.id)
      );

      if (selectedSources.length === 0) {
        store.setTasks([]);
        store.setSyncing(false);
        return {
          success: true,
          count: 0,
          error: 'Nenhuma lista selecionada para sincronização nas configurações.',
        };
      }

      // Fetch tasks fulfilling criteria:
      // 1. Workspaces selected
      // 2. Lists selected
      // 3. Assignees / User selected (User X)
      // 4. Statuses selected
      const remoteTasks = await provider.fetchTasks(token, selectedSources, {
        selectedStatuses: integration.selectedStatuses,
        selectedAssigneeIds: integration.selectedAssigneeIds,
        hideDoneTasks: integration.hideDoneTasks ?? false,
      });

      // Update SQLite cache and active Store
      await TaskRepository.upsertTasks(remoteTasks);
      store.setTasks(remoteTasks);

      const now = new Date().toISOString();
      const updatedIntegration = { ...integration, lastSyncAt: now };
      await SettingsRepository.saveIntegration(updatedIntegration);
      store.setIntegration(updatedIntegration);
      store.setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      store.setSyncing(false);
      return { success: true, count: remoteTasks.length };
    } catch (error: any) {
      console.warn('Sync failed:', error);
      store.setSyncing(false);
      return { success: false, count: 0, error: error.message || 'Falha na sincronização.' };
    }
  },
};
