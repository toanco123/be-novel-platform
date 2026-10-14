import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ClsService } from 'nestjs-cls'
import { AppException } from '@/common/errors/app.exception'
import { IS_PUBLIC } from '../auth.constants'
import type { AuthenticatedRequest, PublicAccess } from '../auth.types'
import { TokenService } from '../token.service'

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
      if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AppException('invalid_token')
      const actor = await this.tokens.verifyAccessToken(token)
      req.user = actor
      this.cls.set('actor', actor)
      return true
    }
    if (access === 'public') return true
    throw new AppException('unauthenticated')
  }
}
