import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CommentIdParamsDto } from '../dto/comment-id-params.dto'
import { CommentDto } from '../dto/comment.dto'
import { EditCommentDto } from '../dto/edit-comment.dto'
import { ReportCommentDto } from '../dto/report-comment.dto'
import { CommentLikesService } from '../services/comment-likes.service'
import { CommentReportsService } from '../services/comment-reports.service'
import { CommentsService } from '../services/comments.service'

@ApiTags('comments')
@Controller('comments/:id')
export class CommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly likes: CommentLikesService,
    private readonly reports: CommentReportsService,
  ) {}

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

  @Put('like')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Thích bình luận',
    description:
      'Cần đã xác nhận email. Không tự thích; tối đa 300 lượt thích mới / giờ. Đã thích rồi cũng 204.',
  })
  @ApiNoContentResponse({ description: 'Đã thích' })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'story_not_public',
    'own_comment_like',
    'rate_limited',
    'validation_failed',
  )
  async like(@CurrentUser() actor: Actor, @Param() { id }: CommentIdParamsDto) {
    await this.likes.like(actor, id)
  }

  @Delete('like')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bỏ thích bình luận', description: 'Chưa thích cũng 204.' })
  @ApiNoContentResponse({ description: 'Đã bỏ thích' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'validation_failed')
  async unlike(@CurrentUser() actor: Actor, @Param() { id }: CommentIdParamsDto) {
    await this.likes.unlike(actor, id)
  }

  @Post('reports')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Báo cáo bình luận vi phạm',
    description:
      'Cần đã xác nhận email. Bình luận của người khác trong truyện đang công khai. Báo lại thì ' +
      'cập nhật lý do, ghi chú; báo cáo mới tối đa 10 / giờ.',
  })
  @ApiNoContentResponse({ description: 'Đã ghi nhận' })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'own_comment_report',
    'rate_limited',
    'validation_failed',
  )
  async report(
    @CurrentUser() actor: Actor,
    @Param() { id }: CommentIdParamsDto,
    @Body() body: ReportCommentDto,
  ) {
    await this.reports.report(actor, id, body)
  }
}
