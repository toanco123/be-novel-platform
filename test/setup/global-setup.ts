// Chạy một lần trước mọi test e2e: Postgres 17 và Redis thật trong Docker (Testcontainers), chạy
// migration, rồi đưa URL cho các file test qua provide/inject (test/setup/env.ts đặt vào process.env).
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import type { TestProject } from 'vitest/node'
import { runMigrations } from '@/infra/database/migrations'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
    redisUrl: string
  }
}

export default async function setup(project: TestProject) {
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('novel_test')
      .withUsername('novel')
      .withPassword('novel')
      .start(),
    new RedisContainer('redis:7.4-alpine').start(),
  ])
  const databaseUrl = postgres.getConnectionUri()
  await runMigrations(databaseUrl)
  project.provide('databaseUrl', databaseUrl)
  project.provide('redisUrl', redis.getConnectionUrl())
  return async () => {
    await Promise.all([postgres.stop(), redis.stop()])
  }
}
