import { getDatabase } from './db';
import { IntegrationConfig } from '../types';

export interface AppPreferences {
  autostart: boolean;
  globalShortcut: boolean;
}

export const SettingsRepository = {
  /**
   * Salva as preferências gerais do aplicativo
   */
  async saveAppPreferences(prefs: AppPreferences): Promise<void> {
    try {
      localStorage.setItem('dailyflow_app_preferences', JSON.stringify(prefs));
      const db = await getDatabase();
      await db.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`,
        ['app_preferences', JSON.stringify(prefs)]
      );
    } catch (error) {
      console.warn('Error saving app preferences:', error);
    }
  },

  /**
   * Recupera as preferências gerais do aplicativo
   */
  async getAppPreferences(): Promise<AppPreferences> {
    const defaultPrefs: AppPreferences = { autostart: true, globalShortcut: true };
    try {
      // 1. Try SQLite
      try {
        const db = await getDatabase();
        const rows = await db.select<Array<{ key: string; value: string }>>(
          `SELECT value FROM settings WHERE key = 'app_preferences' LIMIT 1`
        );
        if (rows.length > 0 && rows[0].value) {
          return { ...defaultPrefs, ...JSON.parse(rows[0].value) };
        }
      } catch {
        // fallback
      }

      // 2. Try localStorage
      const cached = localStorage.getItem('dailyflow_app_preferences');
      if (cached) {
        return { ...defaultPrefs, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
    return defaultPrefs;
  },

  /**
   * Salva ou atualiza a integração no SQLite (sem expor o token seguro)
   */
  async saveIntegration(config: IntegrationConfig): Promise<void> {
    try {
      localStorage.setItem('dailyflow_integration_config', JSON.stringify(config));
      const db = await getDatabase();
      await db.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`,
        ['integration_config', JSON.stringify(config)]
      );
      await db.execute(
        `INSERT OR REPLACE INTO integrations (
          id, provider, is_active, selected_sources, last_sync_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          config.id,
          config.provider,
          config.isActive ? 1 : 0,
          JSON.stringify(config.selectedSourceIds),
          config.lastSyncAt,
        ]
      );
    } catch (error) {
      console.warn('Error saving integration to SQLite:', error);
    }
  },

  /**
   * Recupera a integração ativa
   */
  async getIntegration(): Promise<IntegrationConfig | null> {
    try {
      // 1. Try SQLite settings table
      try {
        const db = await getDatabase();
        const rows = await db.select<Array<{ key: string; value: string }>>(
          `SELECT value FROM settings WHERE key = 'integration_config' LIMIT 1`
        );
        if (rows.length > 0 && rows[0].value) {
          const parsed = JSON.parse(rows[0].value);
          if (parsed && parsed.isActive) return parsed;
        }
      } catch {
        // continue to fallback
      }

      // 2. Try localStorage cache
      const cached = localStorage.getItem('dailyflow_integration_config');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }

      // 3. Try legacy integrations table
      const db = await getDatabase();
      const rows = await db.select<Array<{
        id: string;
        provider: string;
        is_active: number;
        selected_sources: string;
        last_sync_at: string | null;
      }>>('SELECT * FROM integrations WHERE is_active = 1 LIMIT 1');

      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        provider: row.provider as 'clickup',
        isActive: row.is_active === 1,
        selectedSourceIds: JSON.parse(row.selected_sources || '[]'),
        selectedStatuses: [],
        hideDoneTasks: false,
        lastSyncAt: row.last_sync_at,
      };
    } catch (error) {
      console.warn('Error loading integration from SQLite:', error);
      return null;
    }
  },

  /**
   * Remove a integração do banco
   */
  async deleteIntegration(id: string): Promise<void> {
    try {
      localStorage.removeItem('dailyflow_integration_config');
      const db = await getDatabase();
      await db.execute('DELETE FROM integrations WHERE id = $1', [id]);
      await db.execute(`DELETE FROM settings WHERE key = 'integration_config'`);
    } catch (error) {
      console.warn('Error deleting integration from SQLite:', error);
    }
  },

  /**
   * Salva a configuração de atalho e automação de finalização
   */
  async saveCompletionShortcut(shortcut: import('../types').CompletionShortcut): Promise<void> {
    try {
      localStorage.setItem('dailyflow_completion_shortcut', JSON.stringify(shortcut));
      const db = await getDatabase();
      await db.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`,
        ['completion_shortcut', JSON.stringify(shortcut)]
      );
    } catch (error) {
      console.warn('Error saving completion shortcut:', error);
    }
  },

  /**
   * Recupera a configuração do atalho de finalização
   */
  async getCompletionShortcut(): Promise<import('../types').CompletionShortcut | null> {
    const defaultShortcut: import('../types').CompletionShortcut = {
      id: 'default_shortcut',
      name: 'Finalizar e Notificar',
      targetStatus: 'COMPLETE',
      targetStatusColor: '#10b981',
      commentTemplate: 'Olá @{member}, a tarefa foi finalizada com sucesso e está pronta para revisão! 🚀',
      isEnabled: true,
    };

    try {
      // 1. Try SQLite
      try {
        const db = await getDatabase();
        const rows = await db.select<Array<{ key: string; value: string }>>(
          `SELECT value FROM settings WHERE key = 'completion_shortcut' LIMIT 1`
        );
        if (rows.length > 0 && rows[0].value) {
          return { ...defaultShortcut, ...JSON.parse(rows[0].value) };
        }
      } catch {
        // fallback
      }

      // 2. Try localStorage
      const cached = localStorage.getItem('dailyflow_completion_shortcut');
      if (cached) {
        return { ...defaultShortcut, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }

    return defaultShortcut;
  },
};

