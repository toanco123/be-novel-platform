import type { StorageService } from '@/infra/storage/storage.service'
import { StoriesMapper } from '@/modules/stories/stories.mapper'
import type { StoryCardRow } from '@/modules/stories/stories.types'

const storage = { publicUrl: (key: string) => `https://cdn.test/${key}` } as StorageService
const mapper = new StoriesMapper(storage)

const row = (patch: Partial<StoryCardRow> = {}): StoryCardRow => ({
  id: 'story-id',
  slug: 'truyen-a',
  title: 'Truyện A',
  description: 'Mô tả',
  status: 'ongoing',
  visibility: 'published',
  ownerId: 'owner-id',
  reviewStatus: 'approved',
  authorName: null,
  ownerName: 'Chủ truyện',
  coverPath: 'owner-id/bia.webp',
  coverThumbPath: null,
  genres: [{ slug: 'do-thi', name: 'Đô thị', description: null }],
  chapterCount: 3,
  firstChapterNumber: 1,
  latestChapterNumber: 3,
  latestChapterTitle: 'Ba',
  nextChapterNumber: null,
  nextChapterAt: null,
  viewCount: 10,
  followerCount: 2,
  ratingAvg: 4.5,
  ratingCount: 2,
  ratingCounts: [0, 0, 0, 1, 1],
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-02T00:00:00Z'),
  ...patch,
})

describe('StoriesMapper', () => {
  it('thẻ truyện: tác giả, URL bìa trong thư mục covers, chương mới nhất, ngày ISO', () => {
    expect(mapper.toStory(row())).toEqual({
      id: 'story-id',
      slug: 'truyen-a',
      title: 'Truyện A',
      author: { slug: 'tac-gia-owner-id', name: 'Chủ truyện' },
      genres: [{ slug: 'do-thi', name: 'Đô thị', description: null }],
      status: 'ongoing',
      visibility: 'published',
      description: 'Mô tả',
      coverUrl: 'https://cdn.test/covers/owner-id/bia.webp',
      coverThumbUrl: null,
      chapterCount: 3,
      firstChapterNumber: 1,
      latestChapter: { number: 3, title: 'Ba' },
      nextChapter: null,
      viewCount: 10,
      ratingAvg: 4.5,
      ratingCount: 2,
      ownerId: 'owner-id',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    })
  })

  it('bút danh thay tên tài khoản; chưa có chương; có chương hẹn giờ', () => {
    const story = mapper.toStory(
      row({
        authorName: 'Mặc Hương',
        coverPath: null,
        firstChapterNumber: null,
        latestChapterNumber: null,
        latestChapterTitle: null,
        nextChapterNumber: 4,
        nextChapterAt: new Date('2026-10-20T01:00:00Z'),
      }),
    )
    expect(story).toMatchObject({
      author: { slug: 'tac-gia-owner-id-mac-huong', name: 'Mặc Hương' },
      coverUrl: null,
      firstChapterNumber: null,
      latestChapter: null,
      nextChapter: { number: 4, at: '2026-10-20T01:00:00.000Z' },
    })
  })

  it('chi tiết truyện thêm người theo dõi và phân bố sao', () => {
    expect(mapper.toStoryDetail(row())).toMatchObject({
      followerCount: 2,
      ratingCounts: [0, 0, 0, 1, 1],
    })
  })
})
