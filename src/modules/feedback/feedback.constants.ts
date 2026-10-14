import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'

/** Báo lỗi chương mới tối đa 10 / giờ mỗi người (như trigger chapter_reports_rate_limit) */
export const CHAPTER_REPORT_RATE_LIMIT: RateLimitOptions = { limit: 10, windowSeconds: 3600 }

/** Tin nhắn liên hệ: 3 / giờ mỗi email, 5 / giờ mỗi IP (như trigger contact_messages_rate_limit) */
export const CONTACT_EMAIL_RATE_LIMIT: RateLimitOptions = { limit: 3, windowSeconds: 3600 }
export const CONTACT_IP_RATE_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 3600 }

/** Ghi chú báo lỗi tối đa 500 ký tự (check chapter_reports_note_check) */
export const MAX_REPORT_NOTE = 500

export const REPORT_REASONS = ['typo', 'missing', 'order', 'violation', 'other'] as const
export const CONTACT_TOPICS = ['general', 'bug', 'copyright', 'partnership'] as const
