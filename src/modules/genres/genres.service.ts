// Thể loại: xem công khai; người đã xác nhận email tạo mới, chặn trùng theo slug, tối đa 10 / ngày
// (quản trị viên không giới hạn).
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { pgErrorCode } from '@/common/errors/pg-error'
import { pageWindow } from '@/common/pagination/page'
import type { Page } from '@/common/pagination/pagination.types'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { slugify } from '@/common/utils/slugify'
import type { CreateGenreDto } from './dto/create-genre.dto'
import type { GenreListQueryDto } from './dto/genre-list-query.dto'
import type { GenreDto } from './dto/genre.dto'
import { normalizeGenreName } from './genre-name'
import { CREATE_GENRE_LIMIT } from './genres.constants'
import { toGenre } from './genres.mapper'
import { GenresRepository } from './genres.repository'

@Injectable()
export class GenresService {
  constructor(
    private readonly genres: GenresRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Có `q` thì chỉ thể loại có slug chứa slugify(q); q chỉ có ký tự đặc biệt → trang rỗng */
  async list(query: GenreListQueryDto): Promise<Page<GenreDto>> {
    const page = { page: query.page, pageSize: query.pageSize }
    const slugPart = query.q === undefined ? undefined : slugify(query.q)
    if (slugPart === '') return { items: [], total: 0, ...page }
    const [rows, total] = await Promise.all([
      this.genres.list(pageWindow(query), slugPart),
      this.genres.count(slugPart),
    ])
    return { items: rows.map(toGenre), total, ...page }
  }

  async get(slug: string): Promise<GenreDto> {
    const row = await this.genres.findBySlug(slug)
    if (!row) throw new AppException('not_found')
    return toGenre(row)
  }

  /**
   * Tên chỉ có ký tự đặc biệt (slug rỗng) → validation_failed; trùng → genre_exists kèm thể loại đang
   * có; quá 10 / ngày → rate_limited (chỉ tính lần tạo thành công, như trigger của Supabase)
   */
  async create(actor: Actor, input: CreateGenreDto): Promise<GenreDto> {
    const { name, slug } = normalizeGenreName(input.name)
    if (!slug) {
      throw new AppException('validation_failed', {
        issues: [{ path: 'name', code: 'hasSlug', message: 'name must contain a letter or digit' }],
      })
    }
    await this.ensureNotExists(slug)
    const limited = actor.role !== 'admin'
    const key = `genres:create:user:${actor.id}`
    if (limited) {
      const { allowed, retryAfterSeconds } = await this.rateLimit.peek(key, CREATE_GENRE_LIMIT)
      if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    }
    try {
      await this.genres.insert({
        slug,
        name,
        description: input.description || null,
        createdBy: actor.id,
      })
    } catch (error) {
      // Người khác vừa tạo cùng tên
      if (pgErrorCode(error) === 'genre_exists') await this.ensureNotExists(slug)
      throw error
    }
    if (limited) await this.rateLimit.consume(key, CREATE_GENRE_LIMIT)
    return this.get(slug)
  }

  private async ensureNotExists(slug: string) {
    const existing = await this.genres.findBySlug(slug)
    if (existing) throw new AppException('genre_exists', { genre: toGenre(existing) })
  }
}
