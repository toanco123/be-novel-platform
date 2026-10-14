import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { ResponseDto } from '@/common/response/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { MeDto } from './dto/me.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { UsersService } from './users.service'

@ApiTags('me')
@ApiBearerAuth()
@ApiErrorResponses('unauthenticated', 'invalid_token')
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

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
}
