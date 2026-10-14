import { AppException } from '@/common/errors/app.exception'
import { OAUTH_HTTP_TIMEOUT_MS } from '../oauth.constants'

/** Gọi API của provider, trả JSON; lỗi mạng, hết giờ hoặc status lỗi → 400 oauth_failed */
export async function fetchProviderJson<T>(url: string | URL, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(OAUTH_HTTP_TIMEOUT_MS) })
  } catch {
    throw new AppException('oauth_failed')
  }
  if (!res.ok) throw new AppException('oauth_failed')
  return (await res.json()) as T
}
