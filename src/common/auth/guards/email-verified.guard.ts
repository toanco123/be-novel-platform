import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppException } from '@/common/errors/app.exception'
import { REQUIRE_VERIFIED_EMAIL } from '../auth.constants'
import type { AuthenticatedRequest } from '../auth.types'

/**
 * @RequireVerifiedEmail(): chạy sau JwtAuthGuard, đọc claim `ev` của access token (không truy vấn
 * DB); route không gắn decorator thì cho qua
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_VERIFIED_EMAIL, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().user
    if (!actor) throw new AppException('unauthenticated')
    if (!actor.emailVerified) throw new AppException('email_not_verified')
    return true
  }
}
