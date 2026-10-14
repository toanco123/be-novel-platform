// Chặn người dùng: ẩn bình luận / trả lời của người bị chặn với riêng người chặn; danh sách đã chặn
import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { createTestApp } from '../helpers/app'
import { registerUser, verifiedUser } from '../helpers/auth'
import { createStory } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const auth = (req: request.Test, accessToken: string) =>
  req.set('Authorization', `Bearer ${accessToken}`)
const post = (accessToken: string, slug: string, body: object) =>
  auth(http().post(`/v1/stories/${slug}/comments`), accessToken)
    .send(body)
    .expect(201)
type CommentBody = { id: string; content: string; replyCount: number }
const roots = async (slug: string, accessToken: string) =>
  (await auth(http().get(`/v1/stories/${slug}/comments`), accessToken).expect(200)).body
    .data as CommentBody[]
const repliesOf = async (id: string, accessToken: string) =>
  (await auth(http().get(`/v1/comments/${id}/replies`), accessToken).expect(200)).body
    .data as CommentBody[]

describe('chặn người dùng', () => {
  it('ẩn bình luận, trả lời của người bị chặn với mình; người khác vẫn thấy; bỏ chặn thì hiện lại', async () => {
    const me = await registerUser(app)
    const troll = await verifiedUser(app, { displayName: 'Kẻ phá' })
    const friend = await verifiedUser(app)
    const bystander = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const root = (await post(friend.accessToken, story.slug, { content: 'Gốc của bạn' })).body.data
    await post(troll.accessToken, story.slug, { content: 'Bình luận phá' })
    await post(troll.accessToken, story.slug, { content: 'Trả lời phá', parentId: root.id })
    await post(friend.accessToken, story.slug, { content: 'Trả lời của bạn', parentId: root.id })

    await auth(http().put(`/v1/users/${troll.id}/block`), me.accessToken).expect(204)
    await auth(http().put(`/v1/users/${troll.id}/block`), me.accessToken).expect(204)
    const mine = await roots(story.slug, me.accessToken)
    expect(mine.map((c) => c.content)).toEqual(['Gốc của bạn'])
    expect(mine[0]!.replyCount).toBe(1)
    expect((await repliesOf(root.id, me.accessToken)).map((c) => c.content)).toEqual([
      'Trả lời của bạn',
    ])

    const theirs = await roots(story.slug, bystander.accessToken)
    expect(theirs.map((c) => c.content).toSorted()).toEqual(['Bình luận phá', 'Gốc của bạn'])
    expect(theirs.find((c) => c.id === root.id)!.replyCount).toBe(2)

    const blocked = await auth(http().get('/v1/me/blocks'), me.accessToken).expect(200)
    expect(blocked.body.data).toEqual([
      {
        user: { id: troll.id, displayName: 'Kẻ phá', avatarUrl: null },
        blockedAt: expect.any(String),
      },
    ])

    await auth(http().delete(`/v1/users/${troll.id}/block`), me.accessToken).expect(204)
    await auth(http().delete(`/v1/users/${troll.id}/block`), me.accessToken).expect(204)
    expect(await roots(story.slug, me.accessToken)).toHaveLength(2)
    expect((await auth(http().get('/v1/me/blocks'), me.accessToken)).body.data).toEqual([])
  })

  it('tự chặn → 400 cannot_block_self; tài khoản lạ → 404; id sai dạng → 400; chưa đăng nhập → 401', async () => {
    const me = await registerUser(app)
    const self = await auth(http().put(`/v1/users/${me.id}/block`), me.accessToken).expect(400)
    expect(self.body.error.code).toBe('cannot_block_self')
    await auth(http().put(`/v1/users/${randomUUID()}/block`), me.accessToken).expect(404)
    const bad = await auth(http().put('/v1/users/abc/block'), me.accessToken).expect(400)
    expect(bad.body.error.code).toBe('validation_failed')
    await http().get('/v1/me/blocks').expect(401)
  })
})
