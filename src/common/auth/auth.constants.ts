/** Khóa metadata của @Public() */
export const IS_PUBLIC = 'auth:isPublic'
/** Khóa metadata của @Roles() */
export const ROLES = 'auth:roles'

/** Thuật toán ký access token */
export const JWT_ALG = 'ES256'

/** Cookie refresh token của web: chỉ gửi kèm các request /v1/auth/* */
export const REFRESH_COOKIE = 'refresh_token'
export const REFRESH_COOKIE_PATH = '/v1/auth'

/** Khóa metadata của @RequireVerifiedEmail() */
export const REQUIRE_VERIFIED_EMAIL = 'auth:requireVerifiedEmail'
