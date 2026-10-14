/** state của luồng chuyển trang sống 10 phút; mã một lần trả về client sống 60 giây */
export const OAUTH_STATE_TTL_SECONDS = 600
export const OAUTH_CODE_TTL_SECONDS = 60
/** Khóa Redis */
export const OAUTH_STATE_KEY = 'oauth:state:'
export const OAUTH_CODE_KEY = 'oauth:code:'

/** Gọi API của provider tối đa chừng này */
export const OAUTH_HTTP_TIMEOUT_MS = 10_000

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

/** Graph API của Facebook (mỗi phiên bản sống khoảng 2 năm; nâng khi Facebook báo sắp bỏ) */
export const FACEBOOK_GRAPH_VERSION = 'v24.0'
export const FACEBOOK_AUTHORIZE_URL = `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`
export const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`

export const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys'
export const APPLE_ISSUER = 'https://appleid.apple.com'

/** Giống trigger handle_new_user của Supabase: không có tên thì dùng tên này; tên tối đa 30 ký tự */
export const DEFAULT_DISPLAY_NAME = 'Bạn đọc'
export const DISPLAY_NAME_MAX_LENGTH = 30
/** profiles.avatar_url tối đa 2048 ký tự (check của Supabase) */
export const AVATAR_URL_MAX_LENGTH = 2048

/** Trang của web nhận lỗi khi không biết trả về đâu (state sai hoặc hết hạn) */
export const OAUTH_FALLBACK_PATH = '/auth/callback'
/** Mã lỗi được báo về client qua `?error=`; lỗi khác báo chung oauth_failed */
export const OAUTH_REDIRECT_ERRORS = ['account_banned', 'oauth_email_required', 'email_taken']
