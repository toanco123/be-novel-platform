import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import type { CookieOptions, Request, Response } from 'express'
import { AppConfig } from '@/config/app-config'
import type { Actor } from '@/core/auth/actor'
import { CurrentUser, Public } from '@/core/auth/auth.decorators'
import { AppError } from '@/core/errors/app-error'
import { ApiErrorResponses } from '@/core/http/api-error-responses'
import { type AuthResult, AuthService } from './auth.service'
import { AuthSessionDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto'
import type { ClientMeta } from './session.service'

/** Cookie refresh token của web: chỉ gửi kèm các request /v1/auth/* */
export const REFRESH_COOKIE = 'refresh_token'
const REFRESH_COOKIE_PATH = '/v1/auth'

const ApiClientHeader = () =>
  ApiHeader({
    name: 'X-Client',
    required: false,
    description: '`mobile`: refresh token trả trong body thay vì cookie',
    schema: { type: 'string', enum: ['mobile'] },
  })

/** Body tùy chọn của /refresh, /logout; Swagger UI có sẵn hai ví dụ để chọn */
const ApiRefreshTokenBody = () =>
  ApiBody({
    type: RefreshTokenDto,
    required: false,
    examples: {
      web: { summary: 'Web: để trống, dùng cookie refresh_token', value: {} },
      mobile: { summary: 'Mobile: gửi refresh token', value: { refreshToken: '<refreshToken>' } },
    },
  })

const SESSION_DESCRIPTION =
  'Web nhận refresh token trong cookie HttpOnly `refresh_token` (path /v1/auth); mobile gửi header ' +
  '`X-Client: mobile` để nhận trong body. Trên trang này, gọi xong thì access token được tự điền ' +
  'vào nút Authorize.'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Post('register')
  @Public({ ignoreToken: true })
  @ApiOperation({ summary: 'Đăng ký bằng email + mật khẩu', description: SESSION_DESCRIPTION })
  @ApiClientHeader()
  @ApiCreatedResponse({ type: AuthSessionDto })
  @ApiErrorResponses('validation_failed', 'email_taken', 'rate_limited')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(req, res, await this.auth.register(body, clientMeta(req)))
  }

  @Post('login')
  @HttpCode(200)
  @Public({ ignoreToken: true })
  @ApiOperation({ summary: 'Đăng nhập', description: SESSION_DESCRIPTION })
  @ApiClientHeader()
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiErrorResponses('validation_failed', 'invalid_credentials', 'account_banned', 'rate_limited')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(req, res, await this.auth.login(body, clientMeta(req)))
  }

  @Post('refresh')
  @HttpCode(200)
  @Public({ ignoreToken: true })
  @ApiOperation({
    summary: 'Lấy access token mới (xoay vòng refresh token)',
    description:
      'Refresh token lấy từ body (mobile) hoặc cookie (web). Token cũ hết hiệu lực ngay; gửi lại ' +
      'token cũ thì cả phiên bị thu hồi (`token_reused`).',
  })
  @ApiClientHeader()
  @ApiRefreshTokenBody()
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'token_reused', 'account_banned')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = refreshTokenOf(req, body)
    if (!token) throw new AppError('unauthenticated')
    try {
      return this.respond(req, res, await this.auth.refresh(token, clientMeta(req)))
    } catch (error) {
      // Cookie không còn dùng được thì xóa. token_reused không xóa: có thể tab khác vừa nhận
      // cookie mới
      if (error instanceof AppError && ['invalid_token', 'account_banned'].includes(error.code)) {
        res.clearCookie(REFRESH_COOKIE, this.cookieOptions())
      }
      throw error
    }
  }

  @Post('logout')
  @HttpCode(204)
  @Public({ ignoreToken: true })
  @ApiOperation({
    summary: 'Đăng xuất phiên hiện tại',
    description: 'Thu hồi phiên của refresh token gửi lên và xóa cookie; token sai cũng trả 204.',
  })
  @ApiRefreshTokenBody()
  @ApiNoContentResponse()
  async logout(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = refreshTokenOf(req, body)
    if (token) await this.auth.logout(token)
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions())
  }

  @Post('logout-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất mọi thiết bị' })
  @ApiNoContentResponse()
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  async logoutAll(@CurrentUser() actor: Actor, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(actor.id)
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions())
  }

  /** Mobile: refresh token trong body; web: đặt cookie và bỏ khỏi body */
  private respond(req: Request, res: Response, result: AuthResult): AuthSessionDto {
    const { refreshToken, refreshExpiresAt, ...session } = result
    if (isMobileClient(req)) return { ...session, refreshToken }
    res.cookie(REFRESH_COOKIE, refreshToken, { ...this.cookieOptions(), expires: refreshExpiresAt })
    return session
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    }
  }
}

const isMobileClient = (req: Request) => req.get('x-client')?.toLowerCase() === 'mobile'

function refreshTokenOf(req: Request, body: RefreshTokenDto): string | undefined {
  const cookie: unknown = req.cookies?.[REFRESH_COOKIE]
  return body.refreshToken ?? (typeof cookie === 'string' && cookie ? cookie : undefined)
}

function clientMeta(req: Request): ClientMeta {
  return { ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 512) ?? null }
}
