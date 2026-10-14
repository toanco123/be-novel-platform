import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Người gọi có đang theo dõi truyện không */
export class FollowStatusDto {
  @ApiField()
  following: boolean
}
