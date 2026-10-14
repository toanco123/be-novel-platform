import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ResponsePage } from '@/common/response/decorators/response-page.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CreateGenreDto } from './dto/create-genre.dto'
import { GenreListQueryDto } from './dto/genre-list-query.dto'
import { GenreDto } from './dto/genre.dto'
import { GENRES_CACHE_CONTROL } from './genres.constants'
import { GenresService } from './genres.service'

@ApiTags('genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Get()
  @Public()
  @Header('Cache-Control', GENRES_CACHE_CONTROL)
  @ApiOperation({
    summary: 'Danh sách thể loại',
    description:
      'Thể loại có sẵn trước, rồi thể loại người dùng tạo theo thời gian tạo. `q`: tìm theo tên ' +
      '(không dấu).',
  })
  @ResponsePage(GenreDto)
  @ApiErrorResponses('validation_failed')
  list(@Query() query: GenreListQueryDto) {
    return this.genres.list(query)
  }

  @Get(':slug')
  @Public()
  @Header('Cache-Control', GENRES_CACHE_CONTROL)
  @ApiOperation({ summary: 'Một thể loại' })
  @ResponseDto(GenreDto)
  @ApiErrorResponses('not_found')
  get(@Param('slug') slug: string) {
    return this.genres.get(slug)
  }

  @Post()
  @ApiBearerAuth()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Tạo thể loại',
    description:
      'Cần đã xác nhận email. Trùng tên (không phân biệt dấu, hoa thường) → 409 kèm ' +
      '`details.genre`. Tối đa 10 thể loại / ngày (quản trị viên không giới hạn).',
  })
  @ResponseDto(GenreDto, { status: 201 })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'validation_failed',
    'genre_exists',
    'rate_limited',
  )
  create(@CurrentUser() actor: Actor, @Body() body: CreateGenreDto) {
    return this.genres.create(actor, body)
  }
}
