import { applyDecorators, SerializeOptions, type Type } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import type { ResponseDtoOptions } from './response.types'

/**
 * Route trả về `dto`: response chỉ giữ các trường có @ApiField (lọc cả object con, ClassSerializer
 * toàn cục) và ghi Swagger. Vd @ResponseDto(MeDto), @ResponseDto(AuthSessionDto, { status: 201 })
 */
export const ResponseDto = (dto: Type, { status = 200, description }: ResponseDtoOptions = {}) =>
  applyDecorators(
    SerializeOptions({ type: dto, excludeExtraneousValues: true }),
    ApiResponse({ status, type: dto, description }),
  )
