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
