import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Actor, AuthenticatedRequest } from '../auth.types'

/** Người đang gọi API; ở route @Public() có thể undefined (khách) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
)
