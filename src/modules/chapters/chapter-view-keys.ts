import type { Actor } from '@/common/auth/auth.types'
import { hashToken } from '@/common/crypto/secure-token'

/**
 * Người xem để tính 1 lượt / chương / ngày (như Supabase): người đăng nhập theo id, khách theo IP
 * (băm SHA-256, không giữ IP gốc), không có IP thì chung một khóa
 */
export function viewerKey(actor: Actor | undefined, ip: string | null) {
  if (actor) return `u:${actor.id}`
  return ip ? `ip:${hashToken(ip)}` : 'unknown'
}

/** Khóa Redis "đã tính lượt đọc của người này cho chương này trong ngày" */
export const viewSeenKey = (day: string, storyId: string, chapterNumber: number, viewer: string) =>
  `views:seen:${day}:${storyId}:${chapterNumber}:${viewer}`
