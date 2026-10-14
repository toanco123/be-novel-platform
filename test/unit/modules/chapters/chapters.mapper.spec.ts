import { toChapter, toChapterSummary, toReaderStory } from '@/modules/chapters/chapters.mapper'
import type { StoryDto } from '@/modules/stories/dto/story.dto'

const story: StoryDto = {
  id: 'story-1',
  slug: 'truyen-a',
  title: 'Truyện A',
  author: { slug: 'tac-gia-owner', name: 'Tác giả' },
  genres: [{ slug: 'do-thi', name: 'Đô thị', description: null }],
  status: 'ongoing',
  visibility: 'published',
  description: 'Mô tả',
  coverUrl: 'https://cdn.test/covers/a.webp',
  coverThumbUrl: null,
  chapterCount: 2,
  firstChapterNumber: 1,
  latestChapter: { number: 2, title: 'Hai' },
  nextChapter: { number: 3, at: '2026-10-20T00:00:00.000Z' },
  viewCount: 0,
  ratingAvg: 0,
  ratingCount: 0,
  ownerId: 'owner',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
}

describe('chapters.mapper', () => {
  it('thông tin truyện ở trang đọc chỉ lấy các trường cần', () => {
    expect(toReaderStory(story)).toEqual({
      slug: 'truyen-a',
      title: 'Truyện A',
      author: { slug: 'tac-gia-owner', name: 'Tác giả' },
      status: 'ongoing',
      chapterCount: 2,
      coverUrl: 'https://cdn.test/covers/a.webp',
      visibility: 'published',
      nextChapter: { number: 3, at: '2026-10-20T00:00:00.000Z' },
    })
  })

  it('publishedAt lùi về createdAt khi thiếu (dữ liệu cũ)', () => {
    const createdAt = new Date('2026-10-01T00:00:00Z')
    expect(toChapterSummary({ number: 1, title: 'Một', publishedAt: null, createdAt })).toEqual({
      number: 1,
      title: 'Một',
      publishedAt: '2026-10-01T00:00:00.000Z',
    })
  })

  it('chương có chương trước / sau, thiếu thì null', () => {
    const row = {
      number: 2,
      title: 'Hai',
      content: '<p>Hai</p>',
      publishedAt: new Date('2026-10-02T00:00:00Z'),
      createdAt: new Date('2026-10-01T00:00:00Z'),
    }
    const reader = toReaderStory(story)
    expect(toChapter(reader, row, { number: 1, title: 'Một' }, undefined)).toEqual({
      story: reader,
      number: 2,
      title: 'Hai',
      content: '<p>Hai</p>',
      publishedAt: '2026-10-02T00:00:00.000Z',
      prev: { number: 1, title: 'Một' },
      next: null,
    })
  })
})
