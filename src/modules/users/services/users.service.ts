import { Injectable } from '@nestjs/common'
import { AppException } from '@/common/errors/app.exception'
import type { MeDto } from '../dto/me.dto'
import { toMe } from '../user.mapper'
import { UsersRepository } from '../users.repository'
import type { DeleteAccountInput } from '../users.types'
import { PasswordConfirmationService } from './password-confirmation.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly confirmation: PasswordConfirmationService,
  ) {}

  async getMe(userId: string): Promise<MeDto> {
    const row = await this.users.findWithProfile(userId)
    // Token còn hạn nhưng tài khoản đã bị xóa
    if (!row) throw new AppException('not_found')
    return toMe(row)
  }

  async updateDisplayName(userId: string, displayName: string): Promise<MeDto> {
    await this.users.updateDisplayName(userId, displayName)
    return this.getMe(userId)
  }

  /**
   * Xóa hẳn tài khoản (hồ sơ, phiên, link email xóa theo). Có mật khẩu thì phải đúng mật khẩu
   * (invalid_credentials, 5 lần / 15 phút); không có mật khẩu (chỉ Google / Facebook) thì gõ lại email
   */
  async deleteAccount(userId: string, { password, confirmEmail }: DeleteAccountInput) {
    const user = await this.users.findById(userId)
    if (!user) throw new AppException('not_found')
    if (user.passwordHash) {
      await this.confirmation.confirm(user, password ?? '')
    } else if (confirmEmail?.toLowerCase() !== user.email.toLowerCase()) {
      throw new AppException('validation_failed', {
        issues: [
          {
            path: 'confirmEmail',
            code: 'matchesAccountEmail',
            message: 'confirmEmail must match the account email',
          },
        ],
      })
    }
    await this.users.delete(user.id)
  }
}
