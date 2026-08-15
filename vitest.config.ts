import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'node:path'

/*
 * vitest config
 * Node environment; tests co-located as .test.ts files under src.
 * DB tests need DATABASE_URL/TEST_DATABASE_URL — load .env into process.env.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    env: loadEnv('test', path.resolve(__dirname), ''),
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
