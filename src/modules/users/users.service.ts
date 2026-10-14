import { Injectable } from '@nestjs/common'
import { AppError } from '@/core/errors/app-error'
import type { MeDto } from './dto/me.dto'
import { toMe } from './user.mapper'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getMe(userId: string): Promise<MeDto> {
    const row = await this.users.findWithProfile(userId)
    // Token còn hạn nhưng tài khoản đã bị xóa
    if (!row) throw new AppError('not_found')
    return toMe(row)
  }

  async updateDisplayName(userId: string, displayName: string): Promise<MeDto> {
    await this.users.updateDisplayName(userId, displayName)
    return this.getMe(userId)
  }
}
