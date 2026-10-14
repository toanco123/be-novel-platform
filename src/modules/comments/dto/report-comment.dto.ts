import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import type { CommentReportReason } from '@/infra/database/schema'
import { Trim } from '@/common/validation/decorators/transform.decorator'
import { COMMENT_REPORT_REASONS, MAX_REPORT_NOTE } from '../comments.constants'

/** Báo cáo một bình luận vi phạm */
export class ReportCommentDto {
  @ApiProperty({ enum: COMMENT_REPORT_REASONS })
  @IsIn(COMMENT_REPORT_REASONS)
  reason: CommentReportReason

  @ApiPropertyOptional({
    maxLength: MAX_REPORT_NOTE,
    description: 'Bắt buộc khi reason = other',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(MAX_REPORT_NOTE)
  note?: string
}
