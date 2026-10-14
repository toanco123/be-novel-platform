import { toLibraryItem, toReadingProgress } from '@/modules/library/library.mapper'
import type { StoryDto } from '@/modules/stories/dto/story.dto'

describe('toReadingProgress', () => {
  it('dòng lịch sử → chỗ đọc dở như ReadingProgress của web', () => {
    expect(
      toReadingProgress('truyen-a', {
        chapterNumber: 12,
        chapterTitle: 'Gặp lại',
        progress: 0.5,
        readAt: new Date('2026-10-14T01:02:03Z'),
      }),
    ).toEqual({
      slug: 'truyen-a',
      chapter: 12,
      chapterTitle: 'Gặp lại',
      progress: 0.5,
      readAt: '2026-10-14T01:02:03.000Z',
    })
  })
})

describe('toLibraryItem', () => {
  const story = { slug: 'truyen-a' } as StoryDto
  const row = {
    storyId: 'story-1',
    followedAt: new Date('2026-10-01T00:00:00Z'),
    seenChapter: 5,
    newChapters: 2,
  }

  it('kèm chỗ đọc dở theo slug của truyện', () => {
    expect(
      toLibraryItem(story, row, {
        chapterNumber: 4,
        chapterTitle: 'Bốn',
        progress: 0.3,
        readAt: new Date('2026-10-02T00:00:00Z'),
      }),
    ).toEqual({
      story,
      followedAt: '2026-10-01T00:00:00.000Z',
      seenChapter: 5,
      newChapters: 2,
      progress: {
        slug: 'truyen-a',
        chapter: 4,
        chapterTitle: 'Bốn',
        progress: 0.3,
        readAt: '2026-10-02T00:00:00.000Z',
      },
    })
  })

  it('chưa đọc → progress null', () => {
    expect(toLibraryItem(story, row, undefined).progress).toBeNull()
  })
})
