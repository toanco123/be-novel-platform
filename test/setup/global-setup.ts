// Chạy một lần trước mọi test e2e: Postgres 17, Redis, Mailpit, RustFS (S3) thật trong Docker
// (Testcontainers), chạy migration, tạo bucket, rồi đưa URL cho các file test qua provide/inject
// (test/setup/env.ts đặt vào process.env; test đọc thư qua API của Mailpit).
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { GenericContainer, Wait } from 'testcontainers'
import type { TestProject } from 'vitest/node'
import { runMigrations } from '@/infra/database/migrations'
import { ensurePublicBucket } from '@/infra/storage/storage-setup'

const MAILPIT_SMTP_PORT = 1025
const MAILPIT_HTTP_PORT = 8025
const S3_PORT = 9000
/** Khóa của RustFS trong test (khớp mặc định S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY) */
const S3_KEYS = { accessKeyId: 'novel', secretAccessKey: 'novel-secret' }
const S3_BUCKET = 'novel'

export default async function setup(project: TestProject) {
  const [postgres, redis, mailpit, rustfs] = await Promise.all([
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
    new GenericContainer('rustfs/rustfs:1.0.1')
      .withEnvironment({
        RUSTFS_ACCESS_KEY: S3_KEYS.accessKeyId,
        RUSTFS_SECRET_KEY: S3_KEYS.secretAccessKey,
      })
      .withExposedPorts(S3_PORT)
      .withWaitStrategy(Wait.forHttp('/health', S3_PORT))
      .start(),
  ])
  const databaseUrl = postgres.getConnectionUri()
  await runMigrations(databaseUrl)
  const host = mailpit.getHost()
  project.provide('databaseUrl', databaseUrl)
  project.provide('redisUrl', redis.getConnectionUrl())
  project.provide('smtpUrl', `smtp://${host}:${mailpit.getMappedPort(MAILPIT_SMTP_PORT)}`)
  project.provide('mailpitUrl', `http://${host}:${mailpit.getMappedPort(MAILPIT_HTTP_PORT)}`)
  const s3Endpoint = `http://${rustfs.getHost()}:${rustfs.getMappedPort(S3_PORT)}`
  await ensurePublicBucket({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    bucket: S3_BUCKET,
    ...S3_KEYS,
  })
  project.provide('s3Endpoint', s3Endpoint)
  return async () => {
    await Promise.all([postgres.stop(), redis.stop(), mailpit.stop(), rustfs.stop()])
  }
}
