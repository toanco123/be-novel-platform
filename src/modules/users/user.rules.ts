import { AppError } from '@/core/errors/app-error'

/** Tài khoản đang bị khóa (banned_until ở tương lai) */
export const isBanned = (user: { bannedUntil: Date | null }, now = new Date()) =>
  user.bannedUntil !== null && user.bannedUntil.getTime() > now.getTime()

/** Lỗi 403 account_banned, kèm thời điểm hết khóa để client hiển thị */
export const accountBanned = (bannedUntil: Date) =>
  new AppError('account_banned', { bannedUntil: bannedUntil.toISOString() })
