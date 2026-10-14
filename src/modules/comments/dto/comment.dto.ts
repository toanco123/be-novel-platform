import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { PublicProfileDto } from '@/modules/users/dto/public-profile.dto'

/** Một bình luận (giống kiểu Comment của web) */
export class CommentDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'thanh-xuan-vuon-truong' })
  storySlug: string

  @ApiField({ type: Number, nullable: true, description: 'null: bình luận của cả truyện' })
  chapterNumber: number | null

  @ApiField({ type: PublicProfileDto, description: 'Người viết (hồ sơ hiện tại)' })
  user: PublicProfileDto

  @ApiField()
  content: string

  @ApiField({ format: 'date-time' })
  createdAt: string

  @ApiField({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'null: bình luận gốc; có giá trị: trả lời của bình luận gốc đó',
  })
  parentId: string | null

  @ApiField({ description: 'Số trả lời người xem thấy (không đếm người mình đã chặn); trả lời: 0' })
  replyCount: number

  @ApiField()
  likeCount: number

  @ApiField({ type: String, nullable: true, format: 'date-time', description: 'null: chưa sửa' })
  editedAt: string | null

  @ApiField({ description: 'Người viết là chủ truyện (truyện không có bút danh): nhãn "Tác giả"' })
  isAuthor: boolean
}
