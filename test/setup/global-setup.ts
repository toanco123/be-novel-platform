// Chạy một lần trước mọi test e2e: Postgres 17 thật trong Docker (Testcontainers), chạy migration,
// rồi đưa URL cho các file test qua provide/inject (test/setup/env.ts đặt vào process.env).
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'
import { runMigrations } from '@/infra/database/migrations'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('novel_test')
    .withUsername('novel')
    .withPassword('novel')
    .start()
  const url = container.getConnectionUri()
  await runMigrations(url)
  project.provide('databaseUrl', url)
  return async () => {
    await container.stop()
  }
}
