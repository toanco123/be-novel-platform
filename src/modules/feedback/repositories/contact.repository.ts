import { Inject, Injectable } from '@nestjs/common'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { contactMessages } from '@/infra/database/schema'
import type { NewContactMessage } from '../feedback.types'

/** Nơi duy nhất ghi contact_messages (quản trị viên đọc ở đợt Quản trị) */
@Injectable()
export class ContactRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(message: NewContactMessage, ex: Executor = this.db) {
    await ex.insert(contactMessages).values(message)
  }
}
