// Chạy migration (npm run db:migrate). Chạy như một bước riêng khi deploy, app không tự migrate lúc
// khởi động. Đọc .env nếu có (dev); production đặt biến môi trường.
import { existsSync } from 'node:fs'
import { validateEnv } from '../config/env.schema'
import { runMigrations } from '../infra/database/migrations'

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const env = validateEnv(process.env)
  await runMigrations(env.DATABASE_URL)
  process.stdout.write('Đã chạy xong migration\n')
}

main().catch((error: unknown) => {
  process.stderr.write(`Migration lỗi: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
