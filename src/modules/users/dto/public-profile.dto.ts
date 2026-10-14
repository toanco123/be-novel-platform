import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Hồ sơ công khai của một người dùng (người viết bình luận, người bị chặn...) */
export class PublicProfileDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'Linh' })
  displayName: string

  @ApiField({ type: String, nullable: true, format: 'uri' })
  avatarUrl: string | null
}
