// Hồ sơ cho tài khoản mới tạo từ mạng xã hội, lấy giống trigger handle_new_user của Supabase.
import {
  AVATAR_URL_MAX_LENGTH,
  DEFAULT_DISPLAY_NAME,
  DISPLAY_NAME_MAX_LENGTH,
} from './oauth.constants'
import type { OAuthProfile } from './oauth.types'

/** Tên provider → phần trước @ của email → "Bạn đọc"; bỏ khoảng trắng, tối đa 30 ký tự */
export function oauthDisplayName({ name, email }: Pick<OAuthProfile, 'name' | 'email'>) {
  const candidates = [name, email?.split('@')[0]]
  for (const candidate of candidates) {
    const value = candidate?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH).trim()
    if (value) return value
  }
  return DEFAULT_DISPLAY_NAME
}

/** Ảnh của provider: chỉ nhận URL https, không quá 2048 ký tự */
export function oauthAvatarUrl({ avatarUrl }: Pick<OAuthProfile, 'avatarUrl'>) {
  if (!avatarUrl || avatarUrl.length > AVATAR_URL_MAX_LENGTH) return null
  return avatarUrl.startsWith('https://') ? avatarUrl : null
}
