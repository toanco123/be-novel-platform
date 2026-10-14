import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireCaptcha } from '@/common/captcha/require-captcha.decorator'
import { clientMeta } from '@/common/http/request-client'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { ChangePasswordDto } from '../dto/change-password.dto'
import { ForgotPasswordDto } from '../dto/forgot-password.dto'
import { ResetPasswordDto } from '../dto/reset-password.dto'
import { AccountPasswordService } from '../services/account-password.service'

@ApiTags('auth')
@Controller('auth')
export class AccountPasswordController {
  constructor(private readonly passwords: AccountPasswordService) {}

  @Post('forgot-password')
  @HttpCode(204)
  @Public({ ignoreToken: true })
  @RequireCaptcha()
  @ApiOperation({
    summary: 'Quên mật khẩu: gửi link đặt lại',
    description:
      'Luôn 204, không cho biết email có tài khoản hay không. Link hết hạn sau 1 giờ. ' +
      'Tối đa 3 lần / giờ / email, 10 lần / giờ / IP.',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses('validation_failed', 'rate_limited')
  async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    await this.passwords.forgot(body.email, clientMeta(req))
  }

  @Post('reset-password')
  @HttpCode(204)
  @Public({ ignoreToken: true })
  @ApiOperation({
    summary: 'Đặt mật khẩu mới bằng link trong thư',
    description: 'Xong thì mọi thiết bị bị đăng xuất; đăng nhập lại bằng mật khẩu mới.',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses('validation_failed', 'invalid_link')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.passwords.reset(body.token, body.password)
  }

  @Post('change-password')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequireCaptcha()
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description: 'Cần mật khẩu hiện tại. Các thiết bị khác bị đăng xuất, thiết bị này giữ phiên.',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'validation_failed',
    'invalid_credentials',
    'same_password',
    'rate_limited',
  )
  async changePassword(@CurrentUser() actor: Actor, @Body() body: ChangePasswordDto) {
    await this.passwords.change(actor, body.currentPassword, body.newPassword)
  }
}
