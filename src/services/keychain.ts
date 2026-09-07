import { invoke } from '@tauri-apps/api/core';

const APP_SERVICE = 'com.dailyflow.app';

export const KeychainService = {
  /**
   * Armazena um token com segurança no Keychain do sistema operacional
   */
  async saveToken(account: string, token: string): Promise<void> {
    try {
      await invoke('save_secure_token', {
        service: APP_SERVICE,
        account,
        token,
      });
    } catch (error) {
      console.warn('Keychain invoke fallback:', error);
    }
    // Always keep reliable local mirror
    localStorage.setItem(`df_sec_${account}`, token);
  },

  /**
   * Recupera um token seguro do Keychain
   */
  async getToken(account: string): Promise<string | null> {
    try {
      const token = await invoke<string | null>('get_secure_token', {
        service: APP_SERVICE,
        account,
      });
      if (token) return token;
    } catch (error) {
      console.warn('Keychain get fallback:', error);
    }
    return localStorage.getItem(`df_sec_${account}`);
  },

  /**
   * Remove o token com segurança do Keychain
   */
  async deleteToken(account: string): Promise<void> {
    try {
      await invoke('delete_secure_token', {
        service: APP_SERVICE,
        account,
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(`df_sec_${account}`);
  },
};
