import { ApiField, ApiFieldOptional } from '@/common/response/decorators/api-field.decorator'
import { ERROR_CODES } from '../error-code'
import type { ErrorCode } from '../errors.types'

/** Phần `error` của body lỗi (Swagger) */
export class ErrorBodyDto {
  @ApiField({ enum: Object.keys(ERROR_CODES), enumName: 'ErrorCode', example: 'not_found' })
  code: ErrorCode

  @ApiField({ description: 'Tiếng Anh, cho dev đọc; client hiển thị lời theo code' })
  message: string

  @ApiFieldOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>
}
