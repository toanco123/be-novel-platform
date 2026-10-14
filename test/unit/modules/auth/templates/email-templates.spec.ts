import { resetPasswordTemplate } from '@/modules/auth/templates/reset-password.template'
import { verifyEmailTemplate } from '@/modules/auth/templates/verify-email.template'

const input = {
  to: 'linh@example.com',
  displayName: 'Linh <script>alert(1)</script>',
  url: 'http://localhost:3000/auth/verify-email?token=abc&x="y"',
}

describe.each([
  ['xác nhận email', verifyEmailTemplate, 'Xác nhận email của bạn', 'Xác nhận email'],
  ['đặt lại mật khẩu', resetPasswordTemplate, 'Đặt lại mật khẩu', 'Đặt mật khẩu mới'],
])('thư %s', (_name, template, subject, action) => {
  const mail = template(input)

  it('đúng người nhận, tiêu đề, link ở cả bản HTML và chữ thuần', () => {
    expect(mail.to).toBe(input.to)
    expect(mail.subject).toBe(subject)
    expect(mail.text).toContain(`${action}: ${input.url}`)
    expect(mail.html).toContain(
      'href="http://localhost:3000/auth/verify-email?token=abc&amp;x=&quot;y&quot;"',
    )
  })

  it('tên người dùng được escape trong HTML, giữ nguyên trong chữ thuần', () => {
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('Linh &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(mail.text).toContain('Chào Linh <script>alert(1)</script>,')
  })
})
