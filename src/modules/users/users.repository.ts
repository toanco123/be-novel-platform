import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DB, type Db, type Executor } from '@/infra/database/db'
import { profiles, users } from '@/infra/database/schema'

/** Tài khoản kèm hồ sơ (dữ liệu của /v1/me) */
export type UserWithProfile = Awaited<ReturnType<UsersRepository['findWithProfile']>>

/** Nơi duy nhất truy vấn bảng users, profiles */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findByEmail(email: string, ex: Executor = this.db) {
    const [row] = await ex.select().from(users).where(eq(users.email, email)).limit(1)
    return row ?? null
  }

  async findById(id: string, ex: Executor = this.db) {
    const [row] = await ex.select().from(users).where(eq(users.id, id)).limit(1)
    return row ?? null
  }

  async findWithProfile(id: string, ex: Executor = this.db) {
    const [row] = await ex
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        bannedUntil: users.bannedUntil,
        createdAt: users.createdAt,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.id))
      .where(eq(users.id, id))
      .limit(1)
    return row ?? null
  }

  /** Tạo tài khoản và hồ sơ; gọi trong transaction. Email trùng: lỗi 23505 users_email_unique */
  async createWithProfile(
    input: { email: string; passwordHash: string | null; displayName: string },
    ex: Executor,
  ) {
    const [user] = await ex
      .insert(users)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .returning()
    await ex.insert(profiles).values({ id: user!.id, displayName: input.displayName })
    return user!
  }

  async updatePasswordHash(id: string, passwordHash: string, ex: Executor = this.db) {
    await ex.update(users).set({ passwordHash }).where(eq(users.id, id))
  }

  async markSignedIn(id: string, ex: Executor = this.db) {
    await ex.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, id))
  }

  async updateDisplayName(id: string, displayName: string, ex: Executor = this.db) {
    await ex.update(profiles).set({ displayName }).where(eq(profiles.id, id))
  }
}
