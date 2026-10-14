import { applyDecorators, SetMetadata, type Type } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'
import { ResponseMetaDto } from './response-meta.dto'
import { RESPONSE_DTO } from './response.constants'
import type { ResponseDtoOptions } from './response.types'

/**
 * Route trả về `dto`: ResponseInterceptor lọc theo DTO (chỉ trường có @ApiField) rồi bọc
 * { data, meta }; Swagger ghi đúng schema đó. Vd @ResponseDto(MeDto),
 * @ResponseDto(AuthSessionDto, { status: 201 })
 */
export const ResponseDto = (dto: Type, { status = 200, description }: ResponseDtoOptions = {}) =>
  applyDecorators(
    SetMetadata(RESPONSE_DTO, dto),
    ApiExtraModels(dto, ResponseMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { $ref: getSchemaPath(dto) },
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
      },
    }),
  )
