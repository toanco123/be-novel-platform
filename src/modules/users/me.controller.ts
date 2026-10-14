import { Body, Controller, Delete, Get, HttpCode, Patch, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { clearRefreshCookie } from '@/common/auth/refresh-cookie'
import { RequireCaptcha } from '@/common/captcha/require-captcha.decorator'
import { ResponseDto } from '@/common/response/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { AppConfig } from '@/config/app-config.service'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { MeDto } from './dto/me.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { UsersService } from './services/users.service'

@ApiTags('me')
@ApiBearerAuth()
@ApiErrorResponses('unauthenticated', 'invalid_token')
@Controller('me')
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly config: AppConfig,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Hồ sơ của tôi' })
  @ResponseDto(MeDto)
  @ApiErrorResponses('not_found')
  me(@CurrentUser() actor: Actor) {
    return this.users.getMe(actor.id)
  }

  @Patch()
  @ApiOperation({ summary: 'Sửa tên hiển thị' })
  @ResponseDto(MeDto)
  @ApiErrorResponses('validation_failed')
  update(@CurrentUser() actor: Actor, @Body() body: UpdateMeDto) {
    return this.users.updateDisplayName(actor.id, body.displayName)
  }

  @Delete()
  @HttpCode(204)
  @RequireCaptcha()
  @ApiOperation({
    summary: 'Xóa tài khoản',
    description:
      'Xóa hẳn tài khoản và đăng xuất mọi thiết bị. Tài khoản có mật khẩu gửi `password`; tài ' +
      'khoản chỉ dùng Google / Facebook gửi `confirmEmail` (gõ lại email).',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses('validation_failed', 'invalid_credentials', 'rate_limited', 'not_found')
  async deleteAccount(
    @CurrentUser() actor: Actor,
    @Body() body: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.users.deleteAccount(actor.id, body)
    clearRefreshCookie(res, this.config.cookieSecure)
  }
}
