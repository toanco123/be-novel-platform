// Token bí mật gửi cho client (refresh token, sau này: link xác nhận email, đặt lại mật khẩu).
// Client giữ chuỗi gốc, DB chỉ lưu SHA-256 nên lộ DB cũng không dùng được token.
import { createHash, randomBytes } from 'node:crypto'

/** Chuỗi ngẫu nhiên an toàn (mặc định 32 byte), dạng base64url */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** SHA-256 (hex) của token, để lưu và tra trong DB */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
