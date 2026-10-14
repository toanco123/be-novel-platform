import { join } from 'node:path'

/** Token inject Drizzle: constructor(@Inject(DB) private readonly db: Db) */
export const DB = Symbol('DB')
/** Token inject client postgres.js (để đóng pool khi tắt app) */
export const PG_CLIENT = Symbol('PG_CLIENT')

/** /health/ready: DB phải trả lời `select 1` trong khoảng này */
export const DB_HEALTH_TIMEOUT_MS = 2000

/** Thư mục SQL migration (drizzle-kit generate sinh ra) */
export const MIGRATIONS_FOLDER = join(process.cwd(), 'drizzle', 'migrations')
