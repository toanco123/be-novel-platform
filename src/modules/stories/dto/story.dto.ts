import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { ChapterRefDto } from './chapter-ref.dto'
import { NextChapterDto } from './next-chapter.dto'
import { StoryAuthorDto } from './story-author.dto'
import { StoryGenreDto } from './story-genre.dto'

/** Thẻ truyện (giống kiểu Story của web); danh sách chỉ có 300 ký tự đầu của mô tả */
export class StoryDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'thanh-xuan-vuon-truong', description: 'Không đổi sau khi tạo' })
  slug: string

  @ApiField({ example: 'Thanh xuân vườn trường' })
  title: string

  @ApiField({ type: StoryAuthorDto })
  author: StoryAuthorDto

  @ApiField({ type: [StoryGenreDto], description: 'Theo thứ tự tác giả chọn' })
  genres: StoryGenreDto[]

  @ApiField({ enum: ['ongoing', 'completed'] })
  status: 'ongoing' | 'completed'

  @ApiField({
    enum: ['draft', 'published'],
    description: 'draft chỉ chủ truyện (và quản trị viên với truyện chờ duyệt) thấy',
  })
  visibility: 'draft' | 'published'

  @ApiField()
  description: string

  @ApiField({ type: String, nullable: true, format: 'uri' })
  coverUrl: string | null

  @ApiField({
    type: String,
    nullable: true,
    format: 'uri',
    description: 'Bìa nhỏ 320×480; null: chưa có, dùng coverUrl',
  })
  coverThumbUrl: string | null

  @ApiField({ description: 'Số chương đã xuất bản' })
  chapterCount: number

  @ApiField({ type: Number, nullable: true, description: 'null: chưa có chương nào xuất bản' })
  firstChapterNumber: number | null

  @ApiField({ type: ChapterRefDto, nullable: true, description: 'Chương đã xuất bản mới nhất' })
  latestChapter: ChapterRefDto | null

  @ApiField({ type: NextChapterDto, nullable: true, description: 'Chương hẹn giờ sớm nhất' })
  nextChapter: NextChapterDto | null

  @ApiField()
  viewCount: number

  @ApiField({ example: 4.25, description: '0 khi chưa có lượt chấm' })
  ratingAvg: number

  @ApiField()
  ratingCount: number

  @ApiField({ format: 'uuid', description: 'Chủ truyện' })
  ownerId: string

  @ApiField({ format: 'date-time', description: 'Lần đầu công khai (chưa công khai: lúc tạo)' })
  createdAt: string

  @ApiField({
    format: 'date-time',
    description: 'Mới nhất trong: chương xuất bản gần nhất, lần đầu công khai, lúc tạo',
  })
  updatedAt: string
}
