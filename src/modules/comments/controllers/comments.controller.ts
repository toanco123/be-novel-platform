import { Body, Controller, Delete, Get, HttpCode, Param, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CommentsService } from '../comments.service'
import { CommentIdParamsDto } from '../dto/comment-id-params.dto'
import { CommentDto } from '../dto/comment.dto'
import { EditCommentDto } from '../dto/edit-comment.dto'

@ApiTags('comments')
@Controller('comments/:id')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('replies')
  @Public()
  @ApiOperation({
    summary: 'Trả lời của một bình luận',
    description: 'Cũ trước, tối đa 200. Ẩn trả lời của người mình đã chặn.',
  })
  @ResponseDto(CommentDto, { isArray: true })
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  replies(@Param() { id }: CommentIdParamsDto, @CurrentUser() actor: Actor | undefined) {
    return this.comments.replies(id, actor)
  }

  @Patch()
  @ApiBearerAuth()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Sửa bình luận của mình',
    description: 'Truyện còn công khai, chương còn xuất bản. Nội dung đổi thì đặt `editedAt`.',
  })
  @ResponseDto(CommentDto)
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'forbidden',
    'story_not_public',
    'validation_failed',
  )
  edit(
    @CurrentUser() actor: Actor,
    @Param() { id }: CommentIdParamsDto,
    @Body() { content }: EditCommentDto,
  ) {
    return this.comments.edit(actor, id, content)
  }

  @Delete()
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa bình luận',
    description: 'Người viết hoặc chủ truyện. Trả lời mất theo.',
  })
  @ApiNoContentResponse({ description: 'Đã xóa' })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'not_found',
    'forbidden',
    'validation_failed',
  )
  async remove(@CurrentUser() actor: Actor, @Param() { id }: CommentIdParamsDto) {
    await this.comments.remove(actor, id)
  }
}
