// Chạy trong mỗi worker trước file test: URL Postgres, Redis của Testcontainers (global-setup.ts)
import { inject } from 'vitest'

process.env.DATABASE_URL = inject('databaseUrl')
process.env.REDIS_URL = inject('redisUrl')
