import { invoke } from '@tauri-apps/api/core';
import { getDatabase } from './db';
import { CompletionShortcut, IntegrationConfig } from '../types';

export interface AppPreferences {
  autostart: boolean;
  globalShortcut: boolean;
}

async function readSetting<T>(key: string, legacyKey: string): Promise<T | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{value: string}>>('SELECT value FROM settings WHERE key = $1', [key]);
  if (rows.length) return JSON.parse(rows[0].value);
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return null;
  const value: T = JSON.parse(legacy);
  await writeSetting(key, value);
  localStorage.removeItem(legacyKey);
  return value;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  const db = await getDatabase();
  await db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', [key, JSON.stringify(value)]);
}

export const SettingsRepository = {
  async saveAppPreferences(prefs: AppPreferences): Promise<void> {
    await invoke('apply_preferences', {...prefs});
    await writeSetting('app_preferences', prefs);
    localStorage.removeItem('dailyflow_app_preferences');
  },
  async getAppPreferences(): Promise<AppPreferences> {
    return {autostart: false, globalShortcut: true,
      ...await readSetting<AppPreferences>('app_preferences', 'dailyflow_app_preferences')};
  },
  async saveIntegration(config: IntegrationConfig): Promise<void> {
    await writeSetting('integration_config', config);
    localStorage.removeItem('dailyflow_integration_config');
  },
  async getIntegration(): Promise<IntegrationConfig | null> {
    const config = await readSetting<IntegrationConfig>('integration_config', 'dailyflow_integration_config');
    if (config) return config.isActive ? config : null;
    const db = await getDatabase();
    const rows = await db.select<Array<{id: string; provider: IntegrationConfig['provider']; selected_sources: string; last_sync_at: string | null}>>(
      'SELECT * FROM integrations WHERE is_active = 1 LIMIT 1');
    if (!rows.length) return null;
    const row = rows[0];
    return {id: row.id, provider: row.provider, isActive: true,
      selectedSourceIds: JSON.parse(row.selected_sources || '[]'), selectedStatuses: [],
      hideDoneTasks: false, lastSyncAt: row.last_sync_at};
  },
  async deleteIntegration(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM integrations WHERE id = $1', [id]);
    await db.execute("DELETE FROM settings WHERE key = 'integration_config'");
    localStorage.removeItem('dailyflow_integration_config');
  },
  async saveCompletionShortcut(shortcut: CompletionShortcut): Promise<void> {
    await writeSetting('completion_shortcut', shortcut);
    localStorage.removeItem('dailyflow_completion_shortcut');
  },
  async getCompletionShortcut(): Promise<CompletionShortcut> {
    return {id: 'default_shortcut', name: 'Finalizar e Notificar', targetStatus: 'COMPLETE',
      targetStatusColor: '#10b981', commentTemplate: 'Olá @{member}, a tarefa foi finalizada com sucesso e está pronta para revisão! 🚀',
      isEnabled: false, ...await readSetting<CompletionShortcut>('completion_shortcut', 'dailyflow_completion_shortcut')};
  },
};
