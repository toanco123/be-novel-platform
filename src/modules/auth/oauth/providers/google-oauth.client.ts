// Google: luồng Authorization Code + PKCE, đổi code lấy id token rồi xác minh bằng JWKS của Google.
import { Injectable } from '@nestjs/common'
import { createRemoteJWKSet } from 'jose'
import { AppConfig } from '@/config/app-config.service'
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_ISSUERS,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
} from '../oauth.constants'
import type {
  AuthorizeUrlInput,
  ExchangeCodeInput,
  OAuthProfile,
  OAuthRedirectClient,
} from '../oauth.types'
import { isEmailVerified, verifyIdToken } from './id-token'
import { fetchProviderJson } from './provider-http'

@Injectable()
export class GoogleOAuthClient implements OAuthRedirectClient {
  readonly provider = 'google'
  private readonly jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))

  constructor(private readonly config: AppConfig) {}

  get enabled() {
    return Boolean(this.config.get('GOOGLE_CLIENT_ID') && this.config.get('GOOGLE_CLIENT_SECRET'))
  }

  authorizeUrl({ state, redirectUri, codeChallenge }: AuthorizeUrlInput) {
    const url = new URL(GOOGLE_AUTHORIZE_URL)
    url.search = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID')!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: 'S256' }),
      prompt: 'select_account',
    }).toString()
    return url.toString()
  }

  async exchangeCode({
    code,
    redirectUri,
    codeVerifier,
  }: ExchangeCodeInput): Promise<OAuthProfile> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID')!
    const tokens = await fetchProviderJson<{ id_token?: string }>(GOOGLE_TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }),
    })
    const claims = await verifyIdToken(tokens.id_token ?? '', this.jwks, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    })
    return {
      provider: 'google',
      providerUserId: claims.sub,
      email: claims.email ?? null,
      emailVerified: isEmailVerified(claims),
      name: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
    }
  }
}
