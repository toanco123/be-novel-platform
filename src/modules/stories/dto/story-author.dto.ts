import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Tác giả hiển thị của truyện */
export class StoryAuthorDto {
  @ApiField({
    example: 'tac-gia-6f1c2d4e-0b7a-4c1e-9a55-2f3e8d9b1a20',
    description:
      'tac-gia-<ownerId>, thêm -<slugify(bút danh)> khi truyện có bút danh. Cùng slug = cùng tác giả',
  })
  slug: string

  @ApiField({
    example: 'Mặc Hương',
    description: 'Bút danh, không có thì tên hiển thị của chủ truyện',
  })
  name: string
}
