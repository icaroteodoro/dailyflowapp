import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClickUpProvider } from '../src/providers/clickup/ClickUpProvider';
import { source } from './fixtures';
const remote = (id: number) => ({id: String(id), name: `Tarefa ${id}`, status: {status: 'finalizado', type: 'closed', color: '#0f0'}, url: ''});
afterEach(() => vi.unstubAllGlobals());
describe('ClickUp', () => {
  it('fetches subsequent pages and maps custom closed statuses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({tasks: Array.from({length:100}, (_, i) => remote(i))})))
      .mockResolvedValueOnce(new Response(JSON.stringify({tasks: [remote(100)]})));
    vi.stubGlobal('fetch', fetch);
    const tasks = await new ClickUpProvider().fetchTasks('token', [source]);
    expect(tasks).toHaveLength(101);
    expect(fetch.mock.calls[1][0]).toContain('page=1');
    expect(tasks[0].status.isDone).toBe(true);
  });
  it('propagates list failures instead of returning an empty success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('unauthorized', {status: 401})));
    await expect(new ClickUpProvider().fetchTasks('token', [source])).rejects.toThrow('401');
    await expect(new ClickUpProvider().getSources('token', ['team1'])).rejects.toThrow('401');
  });
});
