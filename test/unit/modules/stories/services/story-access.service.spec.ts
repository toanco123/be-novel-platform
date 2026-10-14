import type { Actor } from '@/common/auth/auth.types'
import type { StoriesRepository } from '@/modules/stories/repositories/stories.repository'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import type { StoryAccessRow } from '@/modules/stories/stories.types'

const OWNER = 'owner-id'
const owner: Actor = { id: OWNER, role: 'user', sessionId: 's', emailVerified: true }
const stranger: Actor = { id: 'khac', role: 'user', sessionId: 's', emailVerified: true }

const serviceWith = (story: StoryAccessRow | null) =>
  new StoryAccessService({
    findAccessBySlug: async () => story,
  } as unknown as StoriesRepository)

const story = (patch: Partial<StoryAccessRow> = {}): StoryAccessRow => ({
  id: 'story-id',
  visibility: 'published',
  ownerId: OWNER,
  reviewStatus: 'approved',
  ...patch,
})

describe('StoryAccessService', () => {
  it('visible: không có hoặc không xem được → not_found', async () => {
    await expect(serviceWith(null).visible('x', owner)).rejects.toMatchObject({ code: 'not_found' })
    const draft = story({ visibility: 'draft', reviewStatus: null })
    await expect(serviceWith(draft).visible('x', stranger)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(serviceWith(draft).visible('x', owner)).resolves.toEqual(draft)
  })

  it('public: xem được mà chưa công khai → story_not_public', async () => {
    const draft = story({ visibility: 'draft', reviewStatus: null })
    await expect(serviceWith(draft).public('x', owner)).rejects.toMatchObject({
      code: 'story_not_public',
    })
    await expect(serviceWith(story()).public('x', stranger)).resolves.toMatchObject({
      id: 'story-id',
    })
  })

  it('existing: chỉ cần truyện còn, không xét quyền xem', async () => {
    const draft = story({ visibility: 'draft', reviewStatus: null })
    await expect(serviceWith(draft).existing('x')).resolves.toEqual(draft)
    await expect(serviceWith(null).existing('x')).rejects.toMatchObject({ code: 'not_found' })
  })
})
