import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ERROR_CODES } from './error-code'
import type { ErrorCode } from './errors.types'

/** Dạng lỗi chung của API (hiện trong Swagger) */
export class ErrorResponseDto {
  @ApiProperty({ enum: Object.keys(ERROR_CODES), enumName: 'ErrorCode', example: 'not_found' })
  code: ErrorCode

  @ApiProperty({ description: 'Tiếng Anh, cho dev đọc; client hiển thị lời theo code' })
  message: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>

  @ApiProperty({ example: '0b8e7f7e-2d51-4d1a-a1f3-5f0f6a8c9d22' })
  requestId: string
}
