import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ClsService } from 'nestjs-cls'
import { AppError } from '../errors/app-error'
import type { AuthenticatedRequest } from './actor'
import { IS_PUBLIC, type PublicAccess } from './auth.decorators'
import { TokenService } from './token.service'

/**
 * Guard toàn cục: mọi route cần access token (`Authorization: Bearer ...`), trừ @Public().
 * Token sai hoặc hết hạn thì 401 invalid_token kể cả ở route public, để client biết phải refresh
 * thay vì lặng lẽ thành khách (trừ @Public({ ignoreToken: true })). Không truy vấn DB (token chỉ
 * sống 15 phút).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const access = this.reflector.getAllAndOverride<PublicAccess | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ])
    if (access === 'ignore-token') return true
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = req.headers.authorization
    if (header) {
      const [scheme, token] = header.split(' ')
      if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AppError('invalid_token')
      const actor = await this.tokens.verifyAccessToken(token)
      req.user = actor
      this.cls.set('actor', actor)
      return true
    }
    if (access === 'public') return true
    throw new AppError('unauthenticated')
  }
}
