import { customType } from 'drizzle-orm/pg-core'

/** Chuỗi không phân biệt hoa thường (extension citext, migration đầu): dùng cho email */
export const citext = customType<{ data: string }>({ dataType: () => 'citext' })
