// Gửi email qua SMTP (nodemailer); chỉ chạy trong worker. Dev: Mailpit (xem thư ở :8025).
import { Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { createTransport } from 'nodemailer'
import { AppConfig } from '@/config/app-config.service'
import type { MailMessage } from '../mail.types'

@Injectable()
export class MailerService implements OnApplicationShutdown {
  private readonly transport: ReturnType<typeof createTransport>

  constructor(config: AppConfig) {
    this.transport = createTransport(config.get('SMTP_URL'), { from: config.get('MAIL_FROM') })
  }

  async send(message: MailMessage) {
    await this.transport.sendMail(message)
  }

  onApplicationShutdown() {
    this.transport.close()
  }
}
