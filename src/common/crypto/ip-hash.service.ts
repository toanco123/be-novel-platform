// Băm IP khi cần lưu hoặc đếm theo IP (tin nhắn liên hệ, lượt đọc của khách) mà không giữ IP gốc.
// HMAC có khóa: IPv4 chỉ có 2^32 giá trị nên SHA-256 trần dò ngược được.
import { createHmac } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { AppConfig } from '@/config/app-config.service'
import { DEV_IP_HASH_SECRET } from './crypto.constants'

@Injectable()
export class IpHashService {
  private readonly secret: string

  constructor(config: AppConfig) {
    this.secret = config.get('IP_HASH_SECRET') ?? DEV_IP_HASH_SECRET
  }

  /** HMAC-SHA256 (hex) của IP */
  hash(ip: string) {
    return createHmac('sha256', this.secret).update(ip).digest('hex')
  }
}
