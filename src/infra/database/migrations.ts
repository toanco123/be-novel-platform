// Chạy migration trong drizzle/migrations: dùng chung cho CLI (npm run db:migrate) và test e2e
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export const MIGRATIONS_FOLDER = join(process.cwd(), 'drizzle', 'migrations')

/** Chạy mọi migration chưa chạy lên `url` (một kết nối riêng, đóng khi xong) */
export async function runMigrations(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await sql.end()
  }
}
