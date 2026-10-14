// Tạo truyện, chương, thể loại thẳng vào DB cho test (API ghi truyện có ở đợt Sáng tác). Trigger của
// DB tự tạo và tính story_stats. Mỗi lần gọi dùng tên, slug riêng để test không đụng nhau.
import { randomInt } from 'node:crypto'
import { slugify } from '@/common/utils/slugify'
import type { Db } from '@/infra/database/database.types'
import { chapters, genres, stories, storyGenres } from '@/infra/database/schema'
import type { TestStory, TestStoryInput } from './helpers.types'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** Chuỗi chữ thường ngẫu nhiên (slug đoán được) */
export const randomLetters = (n: number) =>
  Array.from({ length: n }, () => LETTERS[randomInt(LETTERS.length)]).join('')

/** Thể loại có sẵn của hệ thống (không có người tạo); trả slug */
export async function createGenre(db: Db, name = `The loai ${randomLetters(10)}`) {
  const slug = slugify(name)
  await db.insert(genres).values({ slug, name })
  return slug
}

export async function createStory(db: Db, input: TestStoryInput): Promise<TestStory> {
  const title = input.title ?? `Truyen thu ${randomLetters(12)}`
  const slug = `${slugify(title)}-${randomLetters(6)}`
  const visibility = input.visibility ?? 'published'
  const now = new Date()
  const [story] = await db
    .insert(stories)
    .values({
      ownerId: input.ownerId,
      slug,
      title,
      description: input.description ?? 'Mô tả truyện thử.',
      status: input.status ?? 'ongoing',
      visibility,
      publishedAt: visibility === 'published' ? now : null,
      reviewStatus:
        input.reviewStatus !== undefined
          ? input.reviewStatus
          : visibility === 'published'
            ? 'approved'
            : null,
      reviewReason: input.reviewStatus === 'rejected' ? 'Lý do từ chối' : null,
      authorName: input.authorName,
      coverPath: input.coverPath,
      coverThumbPath: input.coverThumbPath,
    })
    .returning({ id: stories.id })
  const id = story!.id
  if (input.genres?.length) {
    await db
      .insert(storyGenres)
      .values(input.genres.map((genreSlug, position) => ({ storyId: id, genreSlug, position })))
  }
  const chapterInputs = input.chapters ?? [{ number: 1 }]
  if (chapterInputs.length) {
    await db.insert(chapters).values(
      chapterInputs.map((c) => {
        const status = c.status ?? 'published'
        return {
          storyId: id,
          number: c.number,
          title: c.title ?? `Chương ${c.number}`,
          content: c.content ?? `<p>Nội dung chương ${c.number}.</p>`,
          status,
          publishedAt: status === 'published' ? now : null,
          scheduledAt: c.scheduledAt,
        }
      }),
    )
  }
  return { id, slug, title }
}
