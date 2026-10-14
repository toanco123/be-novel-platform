import { Injectable } from '@nestjs/common'
import { StorageService } from '@/infra/storage/storage.service'
import { authorSlug } from './author-slug'
import type { StoryDetailDto } from './dto/story-detail.dto'
import type { StoryDto } from './dto/story.dto'
import { COVERS_PREFIX } from './stories.constants'
import type { StoryCardRow } from './stories.types'

/** Dòng thẻ truyện → DTO trả về (URL ảnh bìa lấy từ nơi lưu ảnh) */
@Injectable()
export class StoriesMapper {
  constructor(private readonly storage: StorageService) {}

  toStory(row: StoryCardRow): StoryDto {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      author: {
        slug: authorSlug(row.ownerId, row.authorName),
        name: row.authorName ?? row.ownerName,
      },
      genres: row.genres.map((g) => ({ slug: g.slug, name: g.name, description: g.description })),
      status: row.status,
      visibility: row.visibility,
      description: row.description,
      coverUrl: this.coverUrl(row.coverPath),
      coverThumbUrl: this.coverUrl(row.coverThumbPath),
      chapterCount: row.chapterCount,
      firstChapterNumber: row.firstChapterNumber,
      latestChapter:
        row.latestChapterNumber === null
          ? null
          : { number: row.latestChapterNumber, title: row.latestChapterTitle ?? '' },
      nextChapter:
        row.nextChapterNumber === null || row.nextChapterAt === null
          ? null
          : { number: row.nextChapterNumber, at: row.nextChapterAt.toISOString() },
      viewCount: row.viewCount,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      ownerId: row.ownerId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  toStoryDetail(row: StoryCardRow): StoryDetailDto {
    return {
      ...this.toStory(row),
      followerCount: row.followerCount,
      ratingCounts: row.ratingCounts,
    }
  }

  /** Đường dẫn trong thư mục bìa → URL công khai; null giữ null */
  private coverUrl(path: string | null) {
    return path ? this.storage.publicUrl(`${COVERS_PREFIX}/${path}`) : null
  }
}
