import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'

/** Người đã đăng nhập (phần 4 gắn req.user) */
type RequestWithUser = Request & { user?: { id: string } }

/**
 * Chặn spam thô cho toàn API: đếm theo người dùng khi đã đăng nhập (nhiều thiết bị cùng một người),
 * khách thì theo IP (req.ip đã tính TRUST_PROXY_HOPS). Health check không bị tính.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return throttleTracker(req as unknown as RequestWithUser)
  }

  protected override async shouldSkip(context: Parameters<ThrottlerGuard['shouldSkip']>[0]) {
    const req = context.switchToHttp().getRequest<Request>()
    return req.path.startsWith('/health')
  }
}

/** Khóa đếm của một request: user:<id> hoặc ip:<địa chỉ> */
export function throttleTracker(req: Pick<RequestWithUser, 'user' | 'ip'>) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`
}
