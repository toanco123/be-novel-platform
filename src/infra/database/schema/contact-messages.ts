// Tin nhắn liên hệ: đúng định nghĩa bảng contact_messages của Supabase sau mọi migration (ip_hash,
// handled_at), trừ default auth.uid() của user_id. Khách cũng gửi được; quản trị viên xem ở đợt
// Quản trị.
import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

export const contactTopic = pgEnum('contact_topic', ['general', 'bug', 'copyright', 'partnership'])

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** null: khách gửi (hoặc người gửi đã xóa tài khoản) */
    userId: uuid(),
    name: text().notNull(),
    email: text().notNull(),
    topic: contactTopic().notNull(),
    message: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** HMAC của IP người gửi (IpHashService), không lưu IP gốc; null: không có IP */
    ipHash: text(),
    /** Quản trị viên đánh dấu đã xử lý; null: chưa xử lý */
    handledAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'contact_messages_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('set null'),
    check('contact_messages_name_check', sql`char_length(${t.name}) between 2 and 60`),
    check(
      'contact_messages_email_check',
      sql`char_length(${t.email}) <= 254 and ${t.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`,
    ),
    check('contact_messages_message_check', sql`char_length(${t.message}) between 10 and 2000`),
    index('contact_messages_user_id_idx').on(t.userId),
    index('contact_messages_email_created_at_idx').on(t.email, t.createdAt.desc().nullsFirst()),
    index('contact_messages_ip_hash_created_at_idx').on(t.ipHash, t.createdAt.desc().nullsFirst()),
    index('contact_messages_unhandled_created_at_idx')
      .on(t.createdAt.desc().nullsFirst())
      .where(sql`${t.handledAt} is null`),
  ],
)
