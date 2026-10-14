import { z } from 'zod'
import { createZodDto, fixNullableTypes } from './zod-dto'

type MetadataFactoryHost = { _OPENAPI_METADATA_FACTORY(): Record<string, Record<string, unknown>> }

describe('createZodDto', () => {
  class ProfileDto extends createZodDto(
    z.object({
      avatarUrl: z.string().nullable(),
      nested: z.object({ bio: z.string().nullable() }),
      name: z.string(),
    }),
  ) {}

  it('chuỗi nullable thành type string + nullable (không thành mảng), cả trong object con', () => {
    const props = (ProfileDto as unknown as MetadataFactoryHost)._OPENAPI_METADATA_FACTORY()
    expect(props.avatarUrl).toMatchObject({ type: 'string', nullable: true })
    expect(props.nested!.properties).toMatchObject({ bio: { type: 'string', nullable: true } })
    expect(props.name).toMatchObject({ type: 'string' })
    expect(props.name).not.toHaveProperty('nullable')
  })

  it('vẫn validate bằng schema zod', () => {
    expect(ProfileDto.schema.parse({ avatarUrl: null, nested: { bio: null }, name: 'a' })).toEqual({
      avatarUrl: null,
      nested: { bio: null },
      name: 'a',
    })
  })

  it('fixNullableTypes giữ nguyên type nhiều kiểu (không chỉ một kiểu + null)', () => {
    expect(fixNullableTypes({ type: ['string', 'number', 'null'] })).toEqual({
      type: ['string', 'number', 'null'],
    })
    expect(fixNullableTypes({ items: [{ type: ['integer', 'null'] }] })).toEqual({
      items: [{ type: 'integer', nullable: true }],
    })
  })
})
