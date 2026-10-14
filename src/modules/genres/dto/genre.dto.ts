import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { GenreCreatorDto } from './genre-creator.dto'

/** Thể loại (giống cột của view genre_cards của Supabase; storyCount thêm khi có module truyện) */
export class GenreDto {
  @ApiField({ example: 'ngon-tinh', description: 'slugify(name), dùng trong đường dẫn' })
  slug: string

  @ApiField({ example: 'Ngôn tình' })
  name: string

  @ApiField({ type: String, nullable: true, example: 'Truyện tình cảm' })
  description: string | null

  @ApiField({
    type: GenreCreatorDto,
    nullable: true,
    description: 'null: thể loại có sẵn của hệ thống (hoặc người tạo đã xóa tài khoản)',
  })
  createdBy: GenreCreatorDto | null

  @ApiField({ format: 'date-time' })
  createdAt: string
}
