import { applyDecorators, SetMetadata, type Type } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'
import { PageMetaDto } from '@/common/pagination/page-meta.dto'
import { RESPONSE_DTO } from '../response.constants'
import type { ResponseShape } from '../response.types'

/**
 * Route trả danh sách (service trả Page<T>): ResponseInterceptor lọc từng phần tử theo `dto` rồi bọc
 * { statusCode, data: [...], meta: { total, page, pageSize, pageCount, requestId } }; Swagger ghi
 * đúng schema đó. Vd @ResponsePage(GenreDto)
 */
export const ResponsePage = (dto: Type, description?: string) =>
  applyDecorators(
    SetMetadata(RESPONSE_DTO, { dto, paginated: true } satisfies ResponseShape),
    ApiExtraModels(dto, PageMetaDto),
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        required: ['statusCode', 'data', 'meta'],
        properties: {
          statusCode: { type: 'integer', example: 200 },
          data: { type: 'array', items: { $ref: getSchemaPath(dto) } },
          meta: { $ref: getSchemaPath(PageMetaDto) },
        },
      },
    }),
  )
