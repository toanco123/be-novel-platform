// createZodDto của nestjs-zod, sửa schema OpenAPI của giá trị nullable. zod 4.6 sinh
// `type: ['string', 'null']` cho `z.string().nullable()`, còn Nest hiểu `type` dạng mảng là
// "mảng các phần tử" (avatarUrl thành string[] trong Swagger). Đổi về dạng OpenAPI 3.0:
// `type: 'string', nullable: true`. DTO luôn import createZodDto từ đây (luật lint).
import { createZodDto as baseCreateZodDto } from 'nestjs-zod'

type MetadataFactoryHost = { _OPENAPI_METADATA_FACTORY(): Record<string, unknown> }

export function createZodDto<TSchema extends Parameters<typeof baseCreateZodDto>[0]>(
  schema: TSchema,
) {
  const Dto = baseCreateZodDto(schema)
  const factory = (Dto as unknown as MetadataFactoryHost)._OPENAPI_METADATA_FACTORY
  // Nest gọi hàm này trên class con (class X extends createZodDto(...)): giữ `this`
  Object.defineProperty(Dto, '_OPENAPI_METADATA_FACTORY', {
    value(this: unknown) {
      return fixNullableTypes(factory.call(this))
    },
  })
  return Dto
}

/** `type: [X, 'null']` → `type: X, nullable: true`, ở mọi độ sâu */
export function fixNullableTypes<T>(node: T): T {
  if (Array.isArray(node)) return node.map(fixNullableTypes) as T
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = fixNullableTypes(value)
  if (Array.isArray(out.type) && out.type.includes('null')) {
    const types = out.type.filter((type) => type !== 'null')
    if (types.length === 1) {
      out.type = types[0]
      out.nullable = true
    }
  }
  return out as T
}
