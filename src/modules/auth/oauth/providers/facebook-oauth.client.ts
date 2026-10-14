// Facebook: luồng Authorization Code (BE giữ app secret), đổi code lấy access token rồi đọc hồ sơ qua
// Graph API. Facebook chỉ trả email đã xác nhận.
import { createHmac } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { AppConfig } from '@/config/app-config.service'
import { FACEBOOK_AUTHORIZE_URL, FACEBOOK_GRAPH_URL } from '../oauth.constants'
import type {
  AuthorizeUrlInput,
  ExchangeCodeInput,
  OAuthProfile,
  OAuthRedirectClient,
} from '../oauth.types'
import { fetchProviderJson } from './provider-http'

type FacebookMe = {
  id: string
  name?: string
  email?: string
  picture?: { data?: { url?: string; is_silhouette?: boolean } }
}

@Injectable()
export class FacebookOAuthClient implements OAuthRedirectClient {
  readonly provider = 'facebook'

  constructor(private readonly config: AppConfig) {}

  get enabled() {
    return Boolean(this.config.get('FACEBOOK_APP_ID') && this.config.get('FACEBOOK_APP_SECRET'))
  }

  authorizeUrl({ state, redirectUri }: AuthorizeUrlInput) {
    const url = new URL(FACEBOOK_AUTHORIZE_URL)
    url.search = new URLSearchParams({
      client_id: this.config.get('FACEBOOK_APP_ID')!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    }).toString()
    return url.toString()
  }

  async exchangeCode({ code, redirectUri }: ExchangeCodeInput): Promise<OAuthProfile> {
    const secret = this.config.get('FACEBOOK_APP_SECRET')!
    const tokenUrl = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
    tokenUrl.search = new URLSearchParams({
      client_id: this.config.get('FACEBOOK_APP_ID')!,
      client_secret: secret,
      redirect_uri: redirectUri,
      code,
    }).toString()
    const { access_token: accessToken } = await fetchProviderJson<{ access_token: string }>(
      tokenUrl,
    )

    const meUrl = new URL(`${FACEBOOK_GRAPH_URL}/me`)
    meUrl.search = new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: accessToken,
      // Chứng minh request đến từ server giữ app secret
      appsecret_proof: createHmac('sha256', secret).update(accessToken).digest('hex'),
    }).toString()
    const me = await fetchProviderJson<FacebookMe>(meUrl)
    const picture = me.picture?.data
    return {
      provider: 'facebook',
      providerUserId: me.id,
      email: me.email ?? null,
      emailVerified: Boolean(me.email),
      name: me.name ?? null,
      avatarUrl: picture?.url && !picture.is_silhouette ? picture.url : null,
    }
  }
}
