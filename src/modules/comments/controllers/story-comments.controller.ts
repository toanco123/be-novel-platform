import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ResponsePage } from '@/common/response/decorators/response-page.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CommentListQueryDto } from '../dto/comment-list-query.dto'
import { CommentDto } from '../dto/comment.dto'
import { CreateCommentDto } from '../dto/create-comment.dto'
import { CommentsService } from '../services/comments.service'

@ApiTags('comments')
@Controller('stories/:slug/comments')
export class StoryCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Bình luận của truyện / chương',
    description:
      'Chỉ bình luận gốc, kèm số trả lời. Không có `chapter`: bình luận của cả truyện. Ẩn ' +
      'bình luận của người mình đã chặn.',
  })
  @ResponsePage(CommentDto)
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  list(
    @Param('slug') slug: string,
    @Query() query: CommentListQueryDto,
    @CurrentUser() actor: Actor | undefined,
  ) {
    return this.comments.list(slug, query, actor)
  }

  @Post()
  @ApiBearerAuth()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Viết bình luận / trả lời',
    description:
      'Cần đã xác nhận email. Truyện đang công khai, chương đã xuất bản. Trả lời một cấp. Gửi ' +
      'lại đúng nội dung trong 10 phút → `duplicate_comment`. Tối đa 3 / phút, 30 / giờ.',
  })
  @ResponseDto(CommentDto, { status: 201 })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'story_not_public',
    'parent_not_found',
    'invalid_parent',
    'duplicate_comment',
    'rate_limited',
    'validation_failed',
  )
  create(@CurrentUser() actor: Actor, @Param('slug') slug: string, @Body() body: CreateCommentDto) {
    return this.comments.create(actor, slug, body)
  }
}
