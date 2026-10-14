import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { oauthAccounts, type OAuthProvider } from '@/infra/database/schema'

/** Nơi duy nhất truy vấn bảng oauth_accounts */
@Injectable()
export class OAuthAccountsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async find(provider: OAuthProvider, providerUserId: string, ex: Executor = this.db) {
    const [row] = await ex
      .select()
      .from(oauthAccounts)
      .where(byAccount(provider, providerUserId))
      .limit(1)
    return row ?? null
  }

  async insert(
    account: {
      provider: OAuthProvider
      providerUserId: string
      userId: string
      email: string | null
    },
    ex: Executor = this.db,
  ) {
    await ex.insert(oauthAccounts).values({ ...account, lastSignInAt: new Date() })
  }

  async markSignedIn(provider: OAuthProvider, providerUserId: string, ex: Executor = this.db) {
    await ex
      .update(oauthAccounts)
      .set({ lastSignInAt: new Date() })
      .where(byAccount(provider, providerUserId))
  }
}

const byAccount = (provider: OAuthProvider, providerUserId: string) =>
  and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId))
