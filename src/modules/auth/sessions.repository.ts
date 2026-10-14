import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DB, type Db, type Executor, type Tx } from '@/infra/database/db'
import { refreshTokens } from '@/infra/database/schema'

export type NewRefreshToken = {
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  userAgent: string | null
  ip: string | null
}

/** Nơi duy nhất truy vấn bảng refresh_tokens */
@Injectable()
export class SessionsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(token: NewRefreshToken, ex: Executor = this.db) {
    const [row] = await ex.insert(refreshTokens).values(token).returning()
    return row!
  }

  async findByHash(tokenHash: string, ex: Executor = this.db) {
    const [row] = await ex
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
    return row ?? null
  }

  /** Khóa dòng tới hết transaction: hai request refresh cùng token chạy lần lượt */
  async findByHashForUpdate(tokenHash: string, tx: Tx) {
    const [row] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
      .for('update')
    return row ?? null
  }

  async markReplaced(id: string, replacedById: string, tx: Tx) {
    const now = new Date()
    await tx
      .update(refreshTokens)
      .set({ revokedAt: now, replacedById, lastUsedAt: now })
      .where(eq(refreshTokens.id, id))
  }

  async revokeFamily(familyId: string, ex: Executor = this.db) {
    await ex
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
  }

  async revokeAllForUser(userId: string, ex: Executor = this.db) {
    await ex
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  }
}
