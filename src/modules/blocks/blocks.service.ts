// Chặn người dùng: người chặn không còn thấy bình luận, trả lời của người bị chặn (comments lọc theo
// notBlockedBy); người bị chặn không biết. Dữ liệu riêng nên không cần xác nhận email.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { toBlockedUser } from './blocks.mapper'
import { BlocksRepository } from './blocks.repository'
import type { BlockedUserDto } from './dto/blocked-user.dto'

@Injectable()
export class BlocksService {
  constructor(private readonly blocks: BlocksRepository) {}

  async list(actor: Actor): Promise<BlockedUserDto[]> {
    return (await this.blocks.list(actor.id)).map(toBlockedUser)
  }

  /** Tự chặn mình → cannot_block_self; tài khoản không có → not_found (khóa ngoại) */
  async block(actor: Actor, userId: string) {
    if (userId === actor.id) throw new AppException('cannot_block_self')
    await this.blocks.block(actor.id, userId)
  }

  async unblock(actor: Actor, userId: string) {
    await this.blocks.unblock(actor.id, userId)
  }
}
