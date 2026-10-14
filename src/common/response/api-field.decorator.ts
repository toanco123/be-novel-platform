// Trường của DTO trả về: chỉ trường có @ApiField mới ra response (@ResponseDto lọc theo @Expose),
// đồng thời ghi Swagger (@ApiProperty). DTO đầu vào vẫn dùng @ApiProperty như thường.
import { applyDecorators } from '@nestjs/common'
import { ApiProperty, ApiPropertyOptional, type ApiPropertyOptions } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

const PRIMITIVES = new Set<unknown>([String, Number, Boolean, Date, Object, Array])

/** Trường là DTO khác (vd MeDto hoặc [ItemDto]) cần @Type để lọc cả object con */
function nestedType(options: ApiPropertyOptions) {
  const type: unknown = Array.isArray(options.type) ? options.type[0] : options.type
  if (typeof type !== 'function' || PRIMITIVES.has(type)) return []
  return [Type(() => type as new () => object)]
}

export const ApiField = (options: ApiPropertyOptions = {}) =>
  applyDecorators(Expose(), ...nestedType(options), ApiProperty(options))

export const ApiFieldOptional = (options: ApiPropertyOptions = {}) =>
  applyDecorators(Expose(), ...nestedType(options), ApiPropertyOptional(options))
