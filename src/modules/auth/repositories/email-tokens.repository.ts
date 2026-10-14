import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor, Tx } from '@/infra/database/database.types'
import { emailTokens, type EmailTokenPurpose, users } from '@/infra/database/schema'
import type { EmailTokenWithUser } from '../auth.types'

/** Nơi duy nhất truy vấn bảng email_tokens */
@Injectable()
export class EmailTokensRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(
    token: {
      userId: string
      purpose: EmailTokenPurpose
      email: string
      tokenHash: string
      expiresAt: Date
    },
    ex: Executor = this.db,
  ) {
    await ex.insert(emailTokens).values(token)
  }

  /** Link cũ chưa dùng cùng mục đích hết hiệu lực (khi gửi link mới, hoặc đã dùng một link) */
  async invalidateUnused(userId: string, purpose: EmailTokenPurpose, ex: Executor = this.db) {
    await ex
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailTokens.userId, userId),
          eq(emailTokens.purpose, purpose),
          isNull(emailTokens.usedAt),
        ),
      )
  }

  /** Khóa dòng tới hết transaction (bấm link hai lần cùng lúc thì chỉ một lần thành công) */
  async findForUpdate(
    tokenHash: string,
    purpose: EmailTokenPurpose,
    tx: Tx,
  ): Promise<EmailTokenWithUser | null> {
    const [row] = await tx
      .select({
        id: emailTokens.id,
        userId: emailTokens.userId,
        email: emailTokens.email,
        expiresAt: emailTokens.expiresAt,
        usedAt: emailTokens.usedAt,
        userEmail: users.email,
      })
      .from(emailTokens)
      .innerJoin(users, eq(users.id, emailTokens.userId))
      .where(and(eq(emailTokens.tokenHash, tokenHash), eq(emailTokens.purpose, purpose)))
      .limit(1)
      .for('update', { of: emailTokens })
    return row ?? null
  }
}
