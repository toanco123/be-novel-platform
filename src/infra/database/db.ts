// Kiểu và token của DB. Chỉ thư mục infra/database được import postgres.js (luật lint);
// nơi khác inject DB và dùng kiểu Db / Tx / Executor ở đây.
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from './schema'

/** Token inject Drizzle: constructor(@Inject(DB) private readonly db: Db) */
export const DB = Symbol('DB')
/** Token inject client postgres.js (để đóng pool khi tắt app) */
export const PG_CLIENT = Symbol('PG_CLIENT')

export type Schema = typeof schema
export type Db = PostgresJsDatabase<Schema>
/** Transaction mở bằng db.transaction(async (tx) => ...) */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
/** Repository nhận cả db lẫn tx, để service quyết định có chạy trong transaction hay không */
export type Executor = Db | Tx
