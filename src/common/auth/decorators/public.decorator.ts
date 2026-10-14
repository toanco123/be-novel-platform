import { SetMetadata } from '@nestjs/common'
import { IS_PUBLIC } from '../auth.constants'
import type { PublicAccess, PublicOptions } from '../auth.types'

/**
 * Route không cần đăng nhập (mặc định mọi route đều cần). `ignoreToken`: bỏ qua header
 * Authorization, dùng cho các route của auth để access token hết hạn vẫn refresh / đăng xuất được
 */
export const Public = (options: PublicOptions = {}) =>
  SetMetadata(IS_PUBLIC, (options.ignoreToken ? 'ignore-token' : 'public') satisfies PublicAccess)
