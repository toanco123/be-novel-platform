import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { clientMeta } from '@/common/http/request-client'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { ContactMessageDto } from '../dto/contact-message.dto'
import { ContactService } from '../services/contact.service'

@ApiTags('feedback')
@Controller('contact-messages')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @Public()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Gửi tin nhắn liên hệ',
    description:
      'Khách cũng gửi được (đăng nhập thì ghi người gửi). Tối đa 3 tin / giờ mỗi email, 5 tin / ' +
      'giờ mỗi IP. Gửi xong không đọc lại được.',
  })
  @ApiNoContentResponse({ description: 'Đã gửi' })
  @ApiErrorResponses('rate_limited', 'validation_failed', 'invalid_token')
  async send(
    @CurrentUser() actor: Actor | undefined,
    @Req() req: Request,
    @Body() body: ContactMessageDto,
  ) {
    await this.contact.send(actor, clientMeta(req).ip, body)
  }
}
