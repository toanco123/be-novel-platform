import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppException } from '@/common/errors/app.exception'
import { ROLES } from '../auth.constants'
import type { AuthenticatedRequest, Role } from '../auth.types'

/** @Roles(...): chạy sau JwtAuthGuard; không có vai trò yêu cầu thì cho qua */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().user
    if (!actor) throw new AppException('unauthenticated')
    if (!roles.includes(actor.role)) throw new AppException('forbidden')
    return true
  }
}
