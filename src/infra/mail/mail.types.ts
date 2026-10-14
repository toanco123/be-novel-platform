/** Một email đã dựng sẵn nội dung (dữ liệu của job `send` trong hàng đợi `mail`) */
export type MailMessage = {
  to: string
  subject: string
  html: string
  /** Bản chữ thuần cho trình đọc mail không hiện HTML */
  text: string
}
