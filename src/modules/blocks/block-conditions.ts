import { type AnyColumn, sql, type SQL } from 'drizzle-orm'
import { userBlocks } from '@/infra/database/schema'

/**
 * Người viết (cột `author`) không bị người xem chặn (như private.my_blocked_ids trong policy đọc
 * comments của Supabase). Khách (không có viewerId) thấy hết
 */
export const notBlockedBy = (viewerId: string | undefined, author: AnyColumn | SQL): SQL =>
  viewerId
    ? sql`not exists (select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${viewerId} and ${userBlocks.blockedId} = ${author})`
    : sql`true`
