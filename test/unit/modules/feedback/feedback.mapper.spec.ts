import { toChapterReport } from '@/modules/feedback/feedback.mapper'

describe('toChapterReport', () => {
  it('dòng báo lỗi → giống kiểu ChapterReport của web', () => {
    expect(
      toChapterReport({
        id: 'r1',
        storySlug: 'truyen-a',
        chapterNumber: 3,
        reason: 'typo',
        note: 'Sai chính tả',
        reporterId: 'u1',
        reporterName: 'Linh',
        status: 'open',
        createdAt: new Date('2026-10-14T00:00:00Z'),
      }),
    ).toEqual({
      id: 'r1',
      storySlug: 'truyen-a',
      chapterNumber: 3,
      reason: 'typo',
      note: 'Sai chính tả',
      reporter: { id: 'u1', displayName: 'Linh' },
      status: 'open',
      createdAt: '2026-10-14T00:00:00.000Z',
    })
  })
})
