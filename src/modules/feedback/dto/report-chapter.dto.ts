import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'
import type { ReportReason } from '@/infra/database/schema'
import { MAX_REPORT_NOTE, REPORT_REASONS } from '../feedback.constants'

/** Báo lỗi một chương */
export class ReportChapterDto {
  @ApiProperty({
    enum: REPORT_REASONS,
    description:
      'typo: lỗi chính tả; missing: thiếu nội dung; order: sai thứ tự; violation: vi phạm',
  })
  @IsIn(REPORT_REASONS)
  reason: ReportReason

  @ApiPropertyOptional({ maxLength: MAX_REPORT_NOTE, description: 'Bắt buộc khi reason = other' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(MAX_REPORT_NOTE)
  note?: string
}
