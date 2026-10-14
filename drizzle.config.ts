// drizzle-kit: sinh migration từ schema (npm run db:generate), mở studio (npm run db:studio).
// Chạy migration dùng dist/cli/migrate.js (npm run db:migrate), không dùng drizzle-kit migrate.
import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// Dev đọc .env; CI và production đặt biến môi trường (không có file .env)
if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema/index.ts',
  out: './drizzle/migrations',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
