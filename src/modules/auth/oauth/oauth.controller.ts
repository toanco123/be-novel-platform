import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { Public } from '@/common/auth/decorators/public.decorator'
import { clientMeta } from '@/common/http/request-client'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { AppConfig } from '@/config/app-config.service'
import { ApiClientHeader } from '../auth-api.decorator'
import { AuthSessionDto } from '../dto/auth-session.dto'
import { AuthService } from '../services/auth.service'
import { sessionResponse } from '../session-response'
import { AppleSignInDto } from './dto/apple-sign-in.dto'
import { OAuthAuthorizeQueryDto } from './dto/oauth-authorize-query.dto'
import { OAuthCallbackQueryDto } from './dto/oauth-callback-query.dto'
import { OAuthExchangeDto } from './dto/oauth-exchange.dto'
import { OAuthProvidersDto } from './dto/oauth-providers.dto'
import { OAuthService } from './services/oauth.service'

@ApiTags('auth')
@Public({ ignoreToken: true })
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Provider đăng nhập mạng xã hội đang bật' })
  @ResponseDto(OAuthProvidersDto)
  providers(): OAuthProvidersDto {
    return { providers: this.oauth.enabledProviders() }
  }

  @Get(':provider/authorize')
  @ApiOperation({
    summary: 'Bắt đầu đăng nhập Google / Facebook (chuyển trang)',
    description:
      'Mở bằng trình duyệt (web) hoặc trình duyệt trong app. Chuyển sang trang đăng nhập của ' +
      'provider; xong thì quay về `redirect_to?code=…` (đổi ở POST /v1/auth/oauth/exchange) hoặc ' +
      '`redirect_to?error=<mã lỗi>`.',
  })
  @ApiResponse({ status: 302, description: 'Chuyển sang trang đăng nhập của provider' })
  @ApiErrorResponses('validation_failed', 'provider_disabled', 'oauth_failed')
  async authorize(
    @Param('provider') provider: string,
    @Query() query: OAuthAuthorizeQueryDto,
    @Res() res: Response,
  ) {
    res.redirect(302, await this.oauth.start(provider, query.redirectTo, query.codeChallenge))
  }

  @Get(':provider/callback')
  @ApiOperation({
    summary: 'Provider quay về (redirect_uri khai báo ở Google / Facebook)',
    description: 'Không gọi trực tiếp. Chuyển về `redirect_to` kèm `?code=` hoặc `?error=`.',
  })
  @ApiResponse({ status: 302, description: 'Chuyển về redirect_to của client' })
  async callback(
    @Param('provider') provider: string,
    @Query() query: OAuthCallbackQueryDto,
    @Res() res: Response,
  ) {
    res.redirect(302, await this.oauth.finish(provider, query))
  }

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đổi mã sau đăng nhập mạng xã hội lấy phiên',
    description:
      'Mã dùng một lần, sống 60 giây; `codeVerifier` phải khớp `code_challenge` lúc authorize. ' +
      'Web nhận refresh token trong cookie, app gửi `X-Client: mobile` để nhận trong body.',
  })
  @ApiClientHeader()
  @ResponseDto(AuthSessionDto)
  @ApiErrorResponses('validation_failed', 'oauth_failed', 'account_banned')
  async exchange(
    @Body() body: OAuthExchangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = await this.oauth.exchange(body.code, body.codeVerifier)
    const session = await this.auth.signIn(userId, clientMeta(req))
    return sessionResponse(req, res, this.config.cookieSecure, session)
  }

  @Post('apple/token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đăng nhập Apple (app iOS) bằng id token',
    description: 'Gửi `X-Client: mobile` để nhận refresh token trong body.',
  })
  @ApiClientHeader()
  @ResponseDto(AuthSessionDto)
  @ApiErrorResponses(
    'validation_failed',
    'provider_disabled',
    'oauth_failed',
    'oauth_email_required',
    'email_taken',
    'account_banned',
  )
  async appleToken(
    @Body() body: AppleSignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = await this.oauth.signInWithApple(body.idToken, body.nonce, body.displayName)
    const session = await this.auth.signIn(userId, clientMeta(req))
    return sessionResponse(req, res, this.config.cookieSecure, session)
  }
}
