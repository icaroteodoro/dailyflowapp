import { invoke } from '@tauri-apps/api/core';
const service = 'com.dailyflow.app';

export const KeychainService = {
  async saveToken(account: string, token: string): Promise<void> {
    await invoke('save_secure_token', { service, account, token });
    localStorage.removeItem(`df_sec_${account}`);
  },
  async getToken(account: string): Promise<string | null> {
    const token = await invoke<string | null>('get_secure_token', { service, account });
    const legacy = localStorage.getItem(`df_sec_${account}`);
    if (legacy) {
      if (!token) await this.saveToken(account, legacy);
      localStorage.removeItem(`df_sec_${account}`);
    }
    return token || legacy;
  },
  async deleteToken(account: string): Promise<void> {
    await invoke('delete_secure_token', { service, account });
    localStorage.removeItem(`df_sec_${account}`);
  },
};
