// Đọc thư app gửi (qua worker) trong Mailpit của test (global-setup.ts), để lấy link xác nhận email,
// đặt lại mật khẩu.
import type { MailpitSearch, ReceivedMail } from './helpers.types'

const mailpitUrl = () => process.env.MAILPIT_URL!

async function search(to: string): Promise<MailpitSearch['messages']> {
  const query = encodeURIComponent(`to:"${to}"`)
  const res = await fetch(`${mailpitUrl()}/api/v1/search?query=${query}`)
  return ((await res.json()) as MailpitSearch).messages
}

/** Chờ tới khi `to` có ít nhất `count` thư; trả các thư, mới nhất trước */
export async function waitForMails(to: string, count = 1, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const messages = await search(to)
    if (messages.length >= count) {
      return Promise.all(
        messages.map(async ({ ID }) => {
          const res = await fetch(`${mailpitUrl()}/api/v1/message/${ID}`)
          const body = (await res.json()) as { Subject: string; Text: string; HTML: string }
          return { subject: body.Subject, text: body.Text, html: body.HTML } satisfies ReceivedMail
        }),
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Không thấy ${count} thư gửi tới ${to} sau ${timeoutMs} ms`)
}

/** Số thư đã gửi tới `to` (không chờ) */
export async function mailCount(to: string) {
  return (await search(to)).length
}

/** Token trong link của thư (query `token`) */
export function linkToken(mail: ReceivedMail) {
  const match = /[?&]token=([A-Za-z0-9_-]+)/.exec(mail.text)
  if (!match) throw new Error('Thư không có link chứa token')
  return match[1]!
}
