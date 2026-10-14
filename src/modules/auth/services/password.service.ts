// Băm và xác minh mật khẩu. Hash mới luôn là argon2id; hash bcrypt của user chuyển từ Supabase
// vẫn đăng nhập được, đúng thì báo needsRehash để băm lại bằng argon2id.
import { Injectable } from '@nestjs/common'
import { argon2id, hash, needsRehash, verify } from 'argon2'
import { compare } from 'bcryptjs'
import type { PasswordCheck } from '../auth.types'

const BCRYPT_HASH = /^\$2[aby]\$/

@Injectable()
export class PasswordService {
  /** Hash giả để email không tồn tại cũng tốn thời gian như so mật khẩu thật */
  private dummyHash?: Promise<string>

  hash(password: string) {
    return hash(password, { type: argon2id })
  }

  async verify(password: string, passwordHash: string): Promise<PasswordCheck> {
    if (passwordHash.startsWith('$argon2')) {
      const ok = await verify(passwordHash, password)
      return { ok, needsRehash: ok && needsRehash(passwordHash) }
    }
    if (BCRYPT_HASH.test(passwordHash)) {
      const ok = await compare(password, passwordHash)
      return { ok, needsRehash: ok }
    }
    return { ok: false, needsRehash: false }
  }

  /** Chạy so khớp với hash giả (không có user hoặc user chỉ dùng OAuth), luôn trả sai */
  async verifyDummy(password: string): Promise<PasswordCheck> {
    this.dummyHash ??= this.hash('dummy-password-for-timing')
    await verify(await this.dummyHash, password)
    return { ok: false, needsRehash: false }
  }
}
