import type { Actor } from '@/common/auth/auth.types'
import { canViewStory } from '@/modules/stories/stories.rules'
import type { StoryAccess } from '@/modules/stories/stories.types'

const OWNER = '6f1c2d4e-0b7a-4c1e-9a55-2f3e8d9b1a20'
const actor = (id: string, role: Actor['role'] = 'user'): Actor => ({
  id,
  role,
  sessionId: 's',
  emailVerified: true,
})
const story = (patch: Partial<StoryAccess> = {}): StoryAccess => ({
  visibility: 'published',
  ownerId: OWNER,
  reviewStatus: 'approved',
  ...patch,
})

describe('canViewStory', () => {
  it('truyện công khai: ai cũng xem được, kể cả khách', () => {
    expect(canViewStory(story(), undefined)).toBe(true)
    expect(canViewStory(story(), actor('khac'))).toBe(true)
  })

  it('truyện nháp: chỉ chủ truyện', () => {
    const draft = story({ visibility: 'draft', reviewStatus: null })
    expect(canViewStory(draft, undefined)).toBe(false)
    expect(canViewStory(draft, actor('khac'))).toBe(false)
    expect(canViewStory(draft, actor(OWNER))).toBe(true)
    expect(canViewStory(draft, actor('admin', 'admin'))).toBe(false)
  })

  it('truyện chờ duyệt: thêm quản trị viên', () => {
    const pending = story({ visibility: 'draft', reviewStatus: 'pending' })
    expect(canViewStory(pending, actor('admin', 'admin'))).toBe(true)
    expect(canViewStory(pending, actor('khac'))).toBe(false)
    expect(
      canViewStory(
        story({ visibility: 'draft', reviewStatus: 'rejected' }),
        actor('admin', 'admin'),
      ),
    ).toBe(false)
  })
})
