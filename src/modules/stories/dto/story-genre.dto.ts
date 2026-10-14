import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Thể loại của truyện */
export class StoryGenreDto {
  @ApiField({ example: 'ngon-tinh' })
  slug: string

  @ApiField({ example: 'Ngôn tình' })
  name: string

  @ApiField({ type: String, nullable: true })
  description: string | null
}
