import { applyDecorators, SetMetadata, type Type } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'
import { ResponseMetaDto } from '../response-meta.dto'
import { RESPONSE_DTO } from '../response.constants'
import type { ResponseDtoOptions, ResponseShape } from '../response.types'

/**
 * Route trả về `dto`: ResponseInterceptor lọc theo DTO (chỉ trường có @ApiField) rồi bọc
 * { statusCode, data, meta }; Swagger ghi đúng schema đó. Vd @ResponseDto(MeDto),
 * @ResponseDto(AuthSessionDto, { status: 201 }). Mảng không phân trang:
 * @ResponseDto(ChapterDto, { isArray: true }) (danh sách phân trang dùng @ResponsePage). Có thể không có
 * dữ liệu: @ResponseDto(ReadingProgressDto, { nullable: true }) → data: null
 */
export const ResponseDto = (
  dto: Type,
  { status = 200, description, isArray = false, nullable = false }: ResponseDtoOptions = {},
) =>
  applyDecorators(
    SetMetadata(RESPONSE_DTO, { dto, paginated: false } satisfies ResponseShape),
    ApiExtraModels(dto, ResponseMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['statusCode', 'data', 'meta'],
        properties: {
          statusCode: { type: 'integer', example: status },
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(dto) } }
            : nullable
              ? { nullable: true, allOf: [{ $ref: getSchemaPath(dto) }] }
              : { $ref: getSchemaPath(dto) },
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
      },
    }),
  )
