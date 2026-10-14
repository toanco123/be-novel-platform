// drizzle-kit: sinh migration từ schema (npm run db:generate), mở studio (npm run db:studio).
// Chạy migration dùng dist/cli/migrate.js (npm run db:migrate), không dùng drizzle-kit migrate.
import { defineConfig } from 'drizzle-kit'

process.loadEnvFile?.()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema/index.ts',
  out: './drizzle/migrations',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
