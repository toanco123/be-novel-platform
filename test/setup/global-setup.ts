// Chạy một lần trước mọi test e2e: Postgres 17, Redis và Mailpit thật trong Docker (Testcontainers),
// chạy migration, rồi đưa URL cho các file test qua provide/inject (test/setup/env.ts đặt vào
// process.env; test đọc thư qua API của Mailpit).
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { GenericContainer, Wait } from 'testcontainers'
import type { TestProject } from 'vitest/node'
import { runMigrations } from '@/infra/database/migrations'

const MAILPIT_SMTP_PORT = 1025
const MAILPIT_HTTP_PORT = 8025

export default async function setup(project: TestProject) {
  const [postgres, redis, mailpit] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('novel_test')
      .withUsername('novel')
      .withPassword('novel')
      .start(),
    new RedisContainer('redis:7.4-alpine').start(),
    new GenericContainer('axllent/mailpit:v1.31.4')
      .withExposedPorts(MAILPIT_SMTP_PORT, MAILPIT_HTTP_PORT)
      .withWaitStrategy(Wait.forHttp('/readyz', MAILPIT_HTTP_PORT))
      .start(),
  ])
  const databaseUrl = postgres.getConnectionUri()
  await runMigrations(databaseUrl)
  const host = mailpit.getHost()
  project.provide('databaseUrl', databaseUrl)
  project.provide('redisUrl', redis.getConnectionUrl())
  project.provide('smtpUrl', `smtp://${host}:${mailpit.getMappedPort(MAILPIT_SMTP_PORT)}`)
  project.provide('mailpitUrl', `http://${host}:${mailpit.getMappedPort(MAILPIT_HTTP_PORT)}`)
  return async () => {
    await Promise.all([postgres.stop(), redis.stop(), mailpit.stop()])
  }
}
