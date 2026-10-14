import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common'
import type { Actor, AuthenticatedRequest, Role } from './actor'

export const IS_PUBLIC = 'auth:isPublic'
export const ROLES = 'auth:roles'

/** `public`: khách gọi được; `ignore-token`: không đọc cả header Authorization */
export type PublicAccess = 'public' | 'ignore-token'

/**
 * Route không cần đăng nhập (mặc định mọi route đều cần). `ignoreToken`: bỏ qua header
 * Authorization, dùng cho các route của auth để access token hết hạn vẫn refresh / đăng xuất được
 */
export const Public = (options: { ignoreToken?: boolean } = {}) =>
  SetMetadata(IS_PUBLIC, (options.ignoreToken ? 'ignore-token' : 'public') satisfies PublicAccess)

/** Route chỉ cho các vai trò này (vd @Roles('admin')); sai vai trò thì 403 forbidden */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles)

/** Người đang gọi API; ở route @Public() có thể undefined (khách) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
)
