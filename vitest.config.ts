import { defineConfig } from 'vitest/config';
process.env.TZ = 'America/Maceio';
export default defineConfig({ test: { environment: 'jsdom', clearMocks: true } });
