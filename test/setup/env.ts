// Chạy trong mỗi worker trước file test: URL Postgres của Testcontainers (global-setup.ts)
import { inject } from 'vitest'

process.env.DATABASE_URL = inject('databaseUrl')
