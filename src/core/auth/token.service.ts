// Ký và xác minh access token: JWT ES256 ngắn hạn (mặc định 15 phút). Khóa lấy từ env; dev / test
// không đặt thì sinh cặp khóa tạm khi khởi động (token cũ hết hiệu lực khi chạy lại).
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import {
  type CryptoKey,
  errors,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from 'jose'
import { AppConfig } from '@/config/app-config.service'
import { AppError } from '../errors/app-error'
import { JWT_ALG } from './auth.constants'
import type { Actor, Role } from './auth.types'
import { normalizePem } from './jwt-keys'

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger('TokenService')
  private privateKey!: CryptoKey
  private publicKey!: CryptoKey

  constructor(private readonly config: AppConfig) {}

  async onModuleInit() {
    const privatePem = this.config.get('JWT_PRIVATE_KEY')
    const publicPem = this.config.get('JWT_PUBLIC_KEY')
    if (privatePem && publicPem) {
      this.privateKey = await importPKCS8(normalizePem(privatePem), JWT_ALG)
      this.publicKey = await importSPKI(normalizePem(publicPem), JWT_ALG)
      return
    }
    // env.schema chặn trường hợp này ở production
    if (this.config.get('NODE_ENV') !== 'test') {
      this.logger.warn(
        'Chưa đặt JWT_PRIVATE_KEY / JWT_PUBLIC_KEY: dùng khóa tạm (npm run keys:generate)',
      )
    }
    const pair = await generateKeyPair(JWT_ALG)
    this.privateKey = pair.privateKey
    this.publicKey = pair.publicKey
  }

  /** Thời hạn access token (giây) */
  get accessTokenTtl() {
    return this.config.get('ACCESS_TOKEN_TTL_SECONDS')
  }

  async signAccessToken(actor: Actor) {
    return new SignJWT({ role: actor.role, sid: actor.sessionId })
      .setProtectedHeader({ alg: JWT_ALG, kid: this.config.get('JWT_KEY_ID'), typ: 'JWT' })
      .setSubject(actor.id)
      .setIssuer(this.config.get('JWT_ISSUER'))
      .setAudience(this.config.get('JWT_AUDIENCE'))
      .setIssuedAt()
      .setExpirationTime(`${this.accessTokenTtl}s`)
      .sign(this.privateKey)
  }

  /** Token hợp lệ thì trả Actor; sai chữ ký, hết hạn, sai issuer / audience thì invalid_token */
  async verifyAccessToken(token: string): Promise<Actor> {
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        algorithms: [JWT_ALG],
        issuer: this.config.get('JWT_ISSUER'),
        audience: this.config.get('JWT_AUDIENCE'),
      })
      const role = payload.role
      if (
        !payload.sub ||
        typeof payload.sid !== 'string' ||
        (role !== 'user' && role !== 'admin')
      ) {
        throw new AppError('invalid_token')
      }
      return { id: payload.sub, role: role as Role, sessionId: payload.sid }
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof errors.JOSEError) throw new AppError('invalid_token')
      throw error
    }
  }
}
