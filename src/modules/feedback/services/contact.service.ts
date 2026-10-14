// Tin nhắn liên hệ: khách cũng gửi được (người đăng nhập thì ghi user_id). Tối đa 3 / giờ mỗi email
// và 5 / giờ mỗi IP (như trigger contact_messages_rate_limit). Chỉ lưu IP đã băm có khóa.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { IpHashService } from '@/common/crypto/ip-hash.service'
import { AppException } from '@/common/errors/app.exception'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'
import type { ContactMessageDto } from '../dto/contact-message.dto'
import { CONTACT_EMAIL_RATE_LIMIT, CONTACT_IP_RATE_LIMIT } from '../feedback.constants'
import { ContactRepository } from '../repositories/contact.repository'

@Injectable()
export class ContactService {
  constructor(
    private readonly contact: ContactRepository,
    private readonly ipHash: IpHashService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async send(actor: Actor | undefined, ip: string | null, input: ContactMessageDto) {
    const ipHash = ip ? this.ipHash.hash(ip) : null
    const limits: { key: string; options: RateLimitOptions }[] = [
      {
        key: `feedback:contact:email:${input.email.toLowerCase()}`,
        options: CONTACT_EMAIL_RATE_LIMIT,
      },
      ...(ipHash ? [{ key: `feedback:contact:ip:${ipHash}`, options: CONTACT_IP_RATE_LIMIT }] : []),
    ]
    for (const { key, options } of limits) {
      const { allowed, retryAfterSeconds } = await this.rateLimit.peek(key, options)
      if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    }
    await this.contact.insert({
      userId: actor?.id ?? null,
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
      ipHash,
    })
    for (const { key, options } of limits) await this.rateLimit.consume(key, options)
  }
}
