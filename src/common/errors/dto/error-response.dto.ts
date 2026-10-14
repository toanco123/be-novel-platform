import { ApiField } from '@/common/response/api-field.decorator'
import { ResponseMetaDto } from '@/common/response/response-meta.dto'
import { ErrorBodyDto } from './error-body.dto'

/** Body lỗi chung của API (Swagger): { statusCode, error, meta } */
export class ErrorResponseDto {
  @ApiField({ type: 'integer', description: 'Trùng HTTP status của response', example: 404 })
  statusCode: number

  @ApiField({ type: ErrorBodyDto })
  error: ErrorBodyDto

  @ApiField({ type: ResponseMetaDto })
  meta: ResponseMetaDto
}
