import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// Biến môi trường cho test: không đọc .env trên máy (AppConfigModule bỏ qua file .env khi NODE_ENV=test)
const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://allowed.test',
  SWAGGER_ENABLED: 'true',
}

const shared = {
  // SWC để chạy decorator và metadata của Nest (esbuild mặc định của vitest không hỗ trợ)
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
}

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: 'unit',
          globals: true,
          include: ['src/**/*.spec.ts'],
          env: testEnv,
        },
      },
      {
        ...shared,
        test: {
          name: 'e2e',
          globals: true,
          include: ['test/**/*.e2e-spec.ts'],
          // Postgres, Redis thật (Testcontainers, cần Docker) cho cả lượt e2e
          globalSetup: ['test/setup/global-setup.ts'],
          setupFiles: ['test/setup/env.ts'],
          env: testEnv,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
