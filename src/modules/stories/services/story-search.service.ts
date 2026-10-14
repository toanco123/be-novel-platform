// Tìm truyện công khai theo tên hoặc tác giả, không phân biệt dấu (chấm điểm như search_stories của
// Supabase và matchScore của web).
import { Injectable } from '@nestjs/common'
import { pageWindow } from '@/common/pagination/page'
import type { Page } from '@/common/pagination/pagination.types'
import { slugify } from '@/common/utils/slugify'
import type { SearchQueryDto } from '../dto/search-query.dto'
import type { StoryDto } from '../dto/story.dto'
import { StoriesRepository } from '../repositories/stories.repository'
import { StoriesMapper } from '../stories.mapper'

@Injectable()
export class StorySearchService {
  constructor(
    private readonly stories: StoriesRepository,
    private readonly mapper: StoriesMapper,
  ) {}

  /** Từ khóa chỉ có ký tự đặc biệt (slug rỗng) → trang rỗng, như web */
  async search(query: SearchQueryDto): Promise<Page<StoryDto>> {
    const q = slugify(query.q)
    const page = { page: query.page, pageSize: query.pageSize }
    if (!q) return { items: [], total: 0, ...page }
    const [rows, total] = await Promise.all([
      this.stories.search(q, pageWindow(query)),
      this.stories.searchCount(q),
    ])
    return { items: rows.map((row) => this.mapper.toStory(row)), total, ...page }
  }
}
