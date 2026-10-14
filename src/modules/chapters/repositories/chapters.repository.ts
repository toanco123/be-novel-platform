import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, desc, eq, gt, gte, lt, type SQL } from 'drizzle-orm'
import type { PageWindow } from '@/common/pagination/pagination.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { chapters } from '@/infra/database/schema'
import type {
  ChapterContentRow,
  ChapterListFilter,
  ChapterOutlineRow,
  ChapterSummaryRow,
} from '../chapters.types'

/** Chương đã xuất bản của truyện (người đọc không bao giờ thấy chương nháp) */
const published = (storyId: string, ...conditions: SQL[]) =>
  and(eq(chapters.storyId, storyId), eq(chapters.status, 'published'), ...conditions)

/** Nơi duy nhất truy vấn chapters cho người đọc */
@Injectable()
export class ChaptersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(
    { storyId, from, order }: ChapterListFilter,
    { offset, limit }: PageWindow,
    ex: Executor = this.db,
  ): Promise<ChapterSummaryRow[]> {
    return ex
      .select({
        number: chapters.number,
        title: chapters.title,
        publishedAt: chapters.publishedAt,
        createdAt: chapters.createdAt,
      })
      .from(chapters)
      .where(this.listWhere(storyId, from))
      .orderBy(order === 'desc' ? desc(chapters.number) : asc(chapters.number))
      .limit(limit)
      .offset(offset)
  }

  async count({ storyId, from }: Omit<ChapterListFilter, 'order'>, ex: Executor = this.db) {
    const [row] = await ex
      .select({ total: count() })
      .from(chapters)
      .where(this.listWhere(storyId, from))
    return row!.total
  }

  /** Chương đã xuất bản số `number`; null nếu không có hoặc còn là bản nháp */
  async findPublished(
    storyId: string,
    number: number,
    ex: Executor = this.db,
  ): Promise<ChapterContentRow | null> {
    const [row] = await ex
      .select({
        number: chapters.number,
        title: chapters.title,
        content: chapters.content,
        publishedAt: chapters.publishedAt,
        createdAt: chapters.createdAt,
      })
      .from(chapters)
      .where(published(storyId, eq(chapters.number, number)))
      .limit(1)
    return row ?? null
  }

  /** Chương đã xuất bản liền trước / liền sau chương `number` (số chương có thể không liền nhau) */
  async neighbor(
    storyId: string,
    number: number,
    side: 'prev' | 'next',
    ex: Executor = this.db,
  ): Promise<ChapterOutlineRow | null> {
    const [row] = await ex
      .select({ number: chapters.number, title: chapters.title })
      .from(chapters)
      .where(
        published(
          storyId,
          side === 'prev' ? lt(chapters.number, number) : gt(chapters.number, number),
        ),
      )
      .orderBy(side === 'prev' ? desc(chapters.number) : asc(chapters.number))
      .limit(1)
    return row ?? null
  }

  /** Tối đa `limit` chương đã xuất bản có số ≥ `from`, tăng dần, kèm nội dung */
  async contentsFrom(
    storyId: string,
    from: number,
    limit: number,
    ex: Executor = this.db,
  ): Promise<ChapterContentRow[]> {
    return ex
      .select({
        number: chapters.number,
        title: chapters.title,
        content: chapters.content,
        publishedAt: chapters.publishedAt,
        createdAt: chapters.createdAt,
      })
      .from(chapters)
      .where(published(storyId, gte(chapters.number, from)))
      .orderBy(asc(chapters.number))
      .limit(limit)
  }

  /** Như contentsFrom nhưng chỉ số và tên (để biết chương sau của chương cuối đợt) */
  async outlineFrom(
    storyId: string,
    from: number,
    limit: number,
    ex: Executor = this.db,
  ): Promise<ChapterOutlineRow[]> {
    return ex
      .select({ number: chapters.number, title: chapters.title })
      .from(chapters)
      .where(published(storyId, gte(chapters.number, from)))
      .orderBy(asc(chapters.number))
      .limit(limit)
  }

  /** Chương `number` có đang xuất bản không */
  async isPublished(storyId: string, number: number, ex: Executor = this.db) {
    const [row] = await ex
      .select({ number: chapters.number })
      .from(chapters)
      .where(published(storyId, eq(chapters.number, number)))
      .limit(1)
    return row !== undefined
  }

  private listWhere(storyId: string, from: number | undefined) {
    return from === undefined ? published(storyId) : published(storyId, gte(chapters.number, from))
  }
}
