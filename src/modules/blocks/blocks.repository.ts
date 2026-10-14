import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { profiles, userBlocks } from '@/infra/database/schema'
import type { BlockedUserRow } from './blocks.types'

/** Nơi duy nhất ghi user_blocks */
@Injectable()
export class BlocksRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Người `blockerId` đã chặn, mới chặn trước */
  async list(blockerId: string, ex: Executor = this.db): Promise<BlockedUserRow[]> {
    return ex
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(profiles, eq(profiles.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt), desc(userBlocks.blockedId))
  }

  /** Chặn; đã chặn rồi thì thôi. Tài khoản không có → lỗi khóa ngoại 23503 (→ not_found) */
  async block(blockerId: string, blockedId: string, ex: Executor = this.db) {
    await ex.insert(userBlocks).values({ blockerId, blockedId }).onConflictDoNothing()
  }

  async unblock(blockerId: string, blockedId: string, ex: Executor = this.db) {
    await ex
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
  }
}
