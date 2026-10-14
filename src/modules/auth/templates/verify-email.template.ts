import type { MailMessage } from '@/infra/mail/mail.types'
import type { EmailLinkInput } from '../auth.types'
import { renderMailLayout } from './mail-layout.template'

/** Thư xác nhận email (gửi khi đăng ký, gửi lại) */
export function verifyEmailTemplate({ to, displayName, url }: EmailLinkInput): MailMessage {
  const subject = 'Xác nhận email của bạn'
  return {
    to,
    subject,
    ...renderMailLayout({
      title: subject,
      greeting: `Chào ${displayName},`,
      paragraphs: [
        'Cảm ơn bạn đã đăng ký. Bấm nút dưới đây để xác nhận email này là của bạn.',
        'Link hết hạn sau 24 giờ và chỉ dùng được một lần.',
      ],
      action: { label: 'Xác nhận email', url },
      footer: 'Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.',
    }),
  }
}
