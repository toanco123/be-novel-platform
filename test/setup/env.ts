// Chạy trong mỗi worker trước file test: URL Postgres, Redis, Mailpit, RustFS của Testcontainers
// (global-setup.ts)
import { inject } from 'vitest'

process.env.DATABASE_URL = inject('databaseUrl')
process.env.REDIS_URL = inject('redisUrl')
process.env.SMTP_URL = inject('smtpUrl')
process.env.MAILPIT_URL = inject('mailpitUrl')
process.env.S3_ENDPOINT = inject('s3Endpoint')
process.env.S3_PUBLIC_URL = `${inject('s3Endpoint')}/novel`
