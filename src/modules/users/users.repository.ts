import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { profiles, users } from '@/infra/database/schema'
import type { NewUserWithProfile, UserWithProfile } from './users.types'

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

  async findWithProfile(id: string, ex: Executor = this.db): Promise<UserWithProfile | null> {
    const [row] = await this.selectWithProfile(ex).where(eq(users.id, id)).limit(1)
    return row ?? null
  }

  async findWithProfileByEmail(email: string, ex: Executor = this.db) {
    const [row] = await this.selectWithProfile(ex).where(eq(users.email, email)).limit(1)
    return row ?? null
  }

  /** Tạo tài khoản và hồ sơ; gọi trong transaction. Email trùng: lỗi 23505 users_email_unique */
  async createWithProfile(input: NewUserWithProfile, ex: Executor) {
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

  async markEmailVerified(id: string, ex: Executor = this.db) {
    await ex
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.emailVerifiedAt)))
  }

  /** Xóa tài khoản; hồ sơ, refresh token, link email xóa theo (cascade) */
  async delete(id: string, ex: Executor = this.db) {
    await ex.delete(users).where(eq(users.id, id))
  }

  private selectWithProfile(ex: Executor) {
    return ex
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
  }
}
