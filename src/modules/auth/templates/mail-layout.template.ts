// Khung chung của email: dựng cả bản HTML (style inline, bảng một cột cho mọi trình đọc mail) và bản
// chữ thuần. Mọi chuỗi đầu vào là chữ thuần, được escape khi chèn vào HTML.
import { APP_NAME } from '@/app.constants'
import { escapeHtml } from '@/common/utils/escape-html'
import type { MailLayoutInput } from '../auth.types'

export function renderMailLayout(input: MailLayoutInput) {
  return { html: html(input), text: text(input) }
}

/** Một đoạn văn của email */
const paragraph = (content: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(content)}</p>`

function html({ title, greeting, paragraphs, action, footer }: MailLayoutInput) {
  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
<tr><td style="padding:28px 28px 8px;font-size:18px;font-weight:bold;color:#111827">${escapeHtml(APP_NAME)}</td></tr>
<tr><td style="padding:12px 28px 8px">
${paragraph(greeting)}
${paragraphs.map(paragraph).join('\n')}
<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 20px;background:#9f1239;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b7280">Nút không bấm được thì mở link này: <a href="${escapeHtml(action.url)}" style="color:#9f1239;word-break:break-all">${escapeHtml(action.url)}</a></p>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:13px;line-height:1.6;color:#6b7280">${escapeHtml(footer)}</td></tr>
</table>
</body>
</html>`
}

function text({ greeting, paragraphs, action, footer }: MailLayoutInput) {
  return [greeting, ...paragraphs, `${action.label}: ${action.url}`, footer, `— ${APP_NAME}`].join(
    '\n\n',
  )
}
