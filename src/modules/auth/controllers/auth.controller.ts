import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { clearRefreshCookie, readRefreshToken } from '@/common/auth/refresh-cookie'
import { RequireCaptcha } from '@/common/captcha/require-captcha.decorator'
import { AppException } from '@/common/errors/app.exception'
import { clientMeta } from '@/common/http/request-client'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { AppConfig } from '@/config/app-config.service'
import { ApiClientHeader, ApiRefreshTokenBody, ApiSessionOperation } from '../auth-api.decorator'
import { AuthSessionDto } from '../dto/auth-session.dto'
import { LoginDto } from '../dto/login.dto'
import { RefreshTokenDto } from '../dto/refresh-token.dto'
import { RegisterDto } from '../dto/register.dto'
import { AuthService } from '../services/auth.service'
import { sessionResponse } from '../session-response'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Post('register')
  @Public({ ignoreToken: true })
  @RequireCaptcha()
  @ApiSessionOperation('Đăng ký bằng email + mật khẩu')
  @ApiClientHeader()
  @ResponseDto(AuthSessionDto, { status: 201 })
  @ApiErrorResponses('validation_failed', 'email_taken', 'rate_limited')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return sessionResponse(
      req,
      res,
      this.config.cookieSecure,
      await this.auth.register(body, clientMeta(req)),
    )
  }

  @Post('login')
  @HttpCode(200)
  @Public({ ignoreToken: true })
  @RequireCaptcha()
  @ApiSessionOperation('Đăng nhập')
  @ApiClientHeader()
  @ResponseDto(AuthSessionDto)
  @ApiErrorResponses('validation_failed', 'invalid_credentials', 'account_banned', 'rate_limited')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return sessionResponse(
      req,
      res,
      this.config.cookieSecure,
      await this.auth.login(body, clientMeta(req)),
    )
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
  @ResponseDto(AuthSessionDto)
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'token_reused', 'account_banned')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readRefreshToken(req, body.refreshToken)
    if (!token) throw new AppException('unauthenticated')
    try {
      return sessionResponse(
        req,
        res,
        this.config.cookieSecure,
        await this.auth.refresh(token, clientMeta(req)),
      )
    } catch (error) {
      // Cookie không còn dùng được thì xóa. token_reused không xóa: có thể tab khác vừa nhận
      // cookie mới
      if (
        error instanceof AppException &&
        ['invalid_token', 'account_banned'].includes(error.code)
      ) {
        clearRefreshCookie(res, this.config.cookieSecure)
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
    const token = readRefreshToken(req, body.refreshToken)
    if (token) await this.auth.logout(token)
    clearRefreshCookie(res, this.config.cookieSecure)
  }

  @Post('logout-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất mọi thiết bị' })
  @ApiNoContentResponse()
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  async logoutAll(@CurrentUser() actor: Actor, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(actor.id)
    clearRefreshCookie(res, this.config.cookieSecure)
  }
}
