import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// Biến môi trường cho test: không đọc .env trên máy (AppConfigModule bỏ qua file .env khi NODE_ENV=test)
const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://allowed.test',
  SWAGGER_ENABLED: 'true',
  // Test giả nhiều IP bằng X-Forwarded-For (rate limit theo IP)
  TRUST_PROXY_HOPS: '1',
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
          include: ['test/unit/**/*.spec.ts'],
          // Unit test không kết nối DB / Redis; URL chỉ để module config (kiểm tra env khi nạp) chạy được
          env: {
            ...testEnv,
            DATABASE_URL: 'postgres://unit:unit@127.0.0.1:1/unit',
            REDIS_URL: 'redis://127.0.0.1:1',
          },
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
