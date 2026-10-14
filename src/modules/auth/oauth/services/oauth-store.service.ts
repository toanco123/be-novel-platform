// Lưu tạm trên Redis cho luồng chuyển trang: `state` (authorize → callback, 10 phút) và mã một lần
// trả về client (callback → exchange, 60 giây). Lấy ra là xóa luôn (GETDEL): mỗi thứ dùng một lần.
import { Inject, Injectable } from '@nestjs/common'
import type { Redis } from 'ioredis'
import { hashToken } from '@/common/crypto/secure-token'
import { REDIS } from '@/infra/redis/redis.constants'
import {
  OAUTH_CODE_KEY,
  OAUTH_CODE_TTL_SECONDS,
  OAUTH_STATE_KEY,
  OAUTH_STATE_TTL_SECONDS,
} from '../oauth.constants'
import type { OAuthCodeGrant, OAuthState } from '../oauth.types'

@Injectable()
export class OAuthStoreService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async saveState(state: string, data: OAuthState) {
    await this.redis.set(this.stateKey(state), JSON.stringify(data), 'EX', OAUTH_STATE_TTL_SECONDS)
  }

  takeState(state: string) {
    return this.take<OAuthState>(this.stateKey(state))
  }

  async saveCode(code: string, grant: OAuthCodeGrant) {
    await this.redis.set(this.codeKey(code), JSON.stringify(grant), 'EX', OAUTH_CODE_TTL_SECONDS)
  }

  takeCode(code: string) {
    return this.take<OAuthCodeGrant>(this.codeKey(code))
  }

  // Khóa là SHA-256: lộ Redis cũng không dùng được state / mã
  private stateKey(state: string) {
    return OAUTH_STATE_KEY + hashToken(state)
  }

  private codeKey(code: string) {
    return OAUTH_CODE_KEY + hashToken(code)
  }

  private async take<T>(key: string): Promise<T | null> {
    const raw = await this.redis.getdel(key)
    return raw ? (JSON.parse(raw) as T) : null
  }
}
