import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppError } from '@/core/errors/app-error'
import type { AuthenticatedRequest, Role } from '../auth.types'
import { ROLES } from '../auth.constants'

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
    if (!actor) throw new AppError('unauthenticated')
    if (!roles.includes(actor.role)) throw new AppError('forbidden')
    return true
  }
}
