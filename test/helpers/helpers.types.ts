/** Người dùng tạo sẵn cho test (đăng ký dạng mobile nên có refresh token) */
export type TestUser = {
  id: string
  email: string
  password: string
  ip: string
  accessToken: string
  refreshToken: string
}

/** Thông tin đăng ký tùy chọn; thiếu thì helper tự sinh */
export type RegisterUserInput = { email?: string; password?: string; displayName?: string }

/** Một thư trong Mailpit (phần test cần) */
export type ReceivedMail = { subject: string; text: string; html: string }

/** Kết quả tìm thư của API Mailpit (phần test cần) */
export type MailpitSearch = { messages: { ID: string; Created: string }[] }

/** Thay một provider của app bằng bản giả khi dựng app test */
export type ProviderOverride = { provide: unknown; useValue: unknown }
