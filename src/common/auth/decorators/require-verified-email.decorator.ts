import { SetMetadata } from '@nestjs/common'
import { REQUIRE_VERIFIED_EMAIL } from '../auth.constants'

/**
 * Route chỉ cho người đã xác nhận email (thao tác viết: đăng truyện, bình luận...); chưa xác nhận
 * thì 403 email_not_verified
 */
export const RequireVerifiedEmail = () => SetMetadata(REQUIRE_VERIFIED_EMAIL, true)
