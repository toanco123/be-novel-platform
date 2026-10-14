import type { Type } from '@nestjs/common'
import { instanceToPlain, plainToInstance } from 'class-transformer'

/** Chỉ giữ trường có @Expose (@ApiField), cả trong object con có @Type */
const OPTIONS = { excludeExtraneousValues: true }

/** Lọc giá trị service trả về theo DTO (object hoặc mảng) */
export function serializeDto(dto: Type, value: unknown): unknown {
  if (value === null || value === undefined) return null
  return instanceToPlain(plainToInstance(dto, value as object, OPTIONS), OPTIONS)
}
