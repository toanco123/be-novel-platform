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

/** Chương tạo thẳng vào DB cho test (mặc định đã xuất bản) */
export type TestChapterInput = {
  number: number
  title?: string
  content?: string
  status?: 'draft' | 'published'
  scheduledAt?: Date
}

/** Truyện tạo thẳng vào DB cho test; thiếu thì helper tự sinh (mặc định công khai, một chương) */
export type TestStoryInput = {
  ownerId: string
  title?: string
  description?: string
  status?: 'ongoing' | 'completed'
  visibility?: 'draft' | 'published'
  reviewStatus?: 'pending' | 'approved' | 'rejected' | null
  authorName?: string
  coverPath?: string
  coverThumbPath?: string
  /** Slug thể loại đã có, theo thứ tự tác giả chọn */
  genres?: string[]
  chapters?: TestChapterInput[]
}

/** Truyện đã tạo */
export type TestStory = { id: string; slug: string; title: string }
