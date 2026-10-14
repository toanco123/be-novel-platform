import type { MailMessage } from '@/infra/mail/mail.types'
import type { EmailLinkInput } from '../auth.types'
import { renderMailLayout } from './mail-layout.template'

/** Thư đặt lại mật khẩu (quên mật khẩu) */
export function resetPasswordTemplate({ to, displayName, url }: EmailLinkInput): MailMessage {
  const subject = 'Đặt lại mật khẩu'
  return {
    to,
    subject,
    ...renderMailLayout({
      title: subject,
      greeting: `Chào ${displayName},`,
      paragraphs: [
        'Có yêu cầu đặt lại mật khẩu cho tài khoản dùng email này. Bấm nút dưới đây để đặt mật khẩu mới.',
        'Link hết hạn sau 1 giờ và chỉ dùng được một lần. Đặt mật khẩu mới xong, mọi thiết bị đang đăng nhập sẽ bị đăng xuất.',
      ],
      action: { label: 'Đặt mật khẩu mới', url },
      footer: 'Nếu bạn không yêu cầu, hãy bỏ qua email này: mật khẩu của bạn vẫn giữ nguyên.',
    }),
  }
}
