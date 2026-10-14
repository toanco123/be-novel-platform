import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { LibraryItemDto } from '../dto/library-item.dto'
import { UpdateCountDto } from '../dto/update-count.dto'
import { LibraryService } from '../services/library.service'

@ApiTags('library')
@ApiBearerAuth()
@Controller('me/library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  @ApiOperation({
    summary: 'Tủ truyện',
    description:
      'Truyện đang theo dõi còn xem được: có chương mới trước, rồi mới cập nhật. Kèm số chương ' +
      'mới và chỗ đọc dở.',
  })
  @ResponseDto(LibraryItemDto, { isArray: true })
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  list(@CurrentUser() actor: Actor) {
    return this.library.list(actor)
  }

  @Get('update-count')
  @ApiOperation({ summary: 'Số truyện đang theo dõi có chương mới' })
  @ResponseDto(UpdateCountDto)
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  updateCount(@CurrentUser() actor: Actor) {
    return this.library.updateCount(actor)
  }
}
