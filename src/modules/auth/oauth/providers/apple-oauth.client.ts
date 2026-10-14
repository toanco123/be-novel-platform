// Apple (app iOS): bảng đăng nhập của hệ thống trả id token; xác minh bằng JWKS của Apple, aud là
// bundle id của app, claim nonce là SHA-256 của nonce gốc app gửi kèm (token không dùng lại được).
import { Injectable } from '@nestjs/common'
import { createRemoteJWKSet } from 'jose'
import { AppConfig } from '@/config/app-config.service'
import { APPLE_ISSUER, APPLE_JWKS_URL } from '../oauth.constants'
import type { OAuthProfile } from '../oauth.types'
import { isEmailVerified, nonceHash, verifyIdToken } from './id-token'

@Injectable()
export class AppleOAuthClient {
  readonly provider = 'apple'
  private readonly jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL))

  constructor(private readonly config: AppConfig) {}

  get enabled() {
    return this.config.get('APPLE_CLIENT_IDS').length > 0
  }

  /** Apple không đưa họ tên vào id token: tên do app gửi kèm (chỉ có ở lần cho phép đầu tiên) */
  async verifyIdToken(idToken: string, nonce: string): Promise<OAuthProfile> {
    const claims = await verifyIdToken(idToken, this.jwks, {
      issuer: APPLE_ISSUER,
      audience: this.config.get('APPLE_CLIENT_IDS'),
      nonceHash: nonceHash(nonce),
    })
    return {
      provider: 'apple',
      providerUserId: claims.sub,
      email: claims.email ?? null,
      emailVerified: isEmailVerified(claims),
      name: null,
      avatarUrl: null,
    }
  }
}
