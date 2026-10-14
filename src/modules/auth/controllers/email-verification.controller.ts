import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { VerifyEmailDto } from '../dto/verify-email.dto'
import { EmailVerificationService } from '../services/email-verification.service'

@ApiTags('auth')
@Controller('auth')
export class EmailVerificationController {
  constructor(private readonly verification: EmailVerificationService) {}

  @Post('verify-email')
  @HttpCode(204)
  @Public({ ignoreToken: true })
  @ApiOperation({
    summary: 'Xác nhận email bằng link trong thư',
    description:
      'Gửi `token` lấy từ link. Xong thì gọi `/v1/auth/refresh` để access token mới có ' +
      'trạng thái đã xác nhận.',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses('validation_failed', 'invalid_link')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    await this.verification.verify(body.token)
  }

  @Post('resend-verification')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gửi lại thư xác nhận email',
    description: 'Đã xác nhận thì không gửi. Link cũ hết hiệu lực. Tối đa 3 lần / giờ.',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'rate_limited')
  async resendVerification(@CurrentUser() actor: Actor) {
    await this.verification.resend(actor.id)
  }
}
