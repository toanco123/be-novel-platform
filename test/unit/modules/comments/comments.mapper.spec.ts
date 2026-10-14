import { toComment } from '@/modules/comments/comments.mapper'

describe('toComment', () => {
  it('dòng bình luận → giống kiểu Comment của web', () => {
    expect(
      toComment({
        id: 'c1',
        storySlug: 'truyen-a',
        chapterNumber: 3,
        userId: 'u1',
        displayName: 'Linh',
        avatarUrl: null,
        content: 'Hay',
        createdAt: new Date('2026-10-14T00:00:00Z'),
        parentId: null,
        replyCount: 2,
        likeCount: 5,
        likedByMe: true,
        editedAt: new Date('2026-10-14T01:00:00Z'),
        isAuthor: true,
      }),
    ).toEqual({
      id: 'c1',
      storySlug: 'truyen-a',
      chapterNumber: 3,
      user: { id: 'u1', displayName: 'Linh', avatarUrl: null },
      content: 'Hay',
      createdAt: '2026-10-14T00:00:00.000Z',
      parentId: null,
      replyCount: 2,
      likeCount: 5,
      likedByMe: true,
      editedAt: '2026-10-14T01:00:00.000Z',
      isAuthor: true,
    })
  })
})
