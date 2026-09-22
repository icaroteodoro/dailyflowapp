import { beforeEach, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { KeychainService } from '../src/services/keychain';
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn()}));
beforeEach(() => { localStorage.clear(); vi.mocked(invoke).mockReset(); });
it('migrates legacy plaintext only after native storage succeeds', async () => {
  localStorage.setItem('df_sec_clickup_api_token', 'legacy');
  vi.mocked(invoke).mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);
  expect(await KeychainService.getToken('clickup_api_token')).toBe('legacy');
  expect(invoke).toHaveBeenLastCalledWith('save_secure_token', expect.objectContaining({token:'legacy'}));
  expect(localStorage.getItem('df_sec_clickup_api_token')).toBeNull();
});
it('does not silently fall back to plaintext if native storage fails', async () => {
  vi.mocked(invoke).mockRejectedValue(new Error('denied'));
  await expect(KeychainService.saveToken('clickup_api_token', 'secret')).rejects.toThrow('denied');
  expect(localStorage.length).toBe(0);
});
