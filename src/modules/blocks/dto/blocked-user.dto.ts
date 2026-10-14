import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { PublicProfileDto } from '@/modules/users/dto/public-profile.dto'

/** Một người mình đã chặn (giống BlockedUser của web) */
export class BlockedUserDto {
  @ApiField({ type: PublicProfileDto })
  user: PublicProfileDto

  @ApiField({ format: 'date-time' })
  blockedAt: string
}
