import { toReadingProgress } from '@/modules/library/history.mapper'

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
