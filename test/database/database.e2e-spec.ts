// Database thật (Testcontainers): health, migration đầu, transaction, lỗi Postgres qua filter
import { Body, Controller, Inject, Module, Post } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { IsString, MinLength } from 'class-validator'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { AppModule } from '@/app.module'
import { Public } from '@/common/auth/decorators/public.decorator'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { createTestApp } from '../helpers/app'

class ItemDto {
  @IsString()
  @MinLength(1)
  name: string
}

/** Bảng chỉ dùng trong test này (không nằm trong schema của app) */
@Public()
@Controller('test-db')
class TestDbController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Post('items')
  async create(@Body() body: ItemDto) {
    const result = await this.db.execute(
      sql`insert into e2e_items (name) values (${body.name}) returning id, name`,
    )
    return result[0]
  }
}

@Module({ imports: [AppModule], controllers: [TestDbController] })
class TestDbModule {}

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp(TestDbModule)
  db = app.get(DB)
  await db.execute(sql`
    create table if not exists e2e_items (
      id serial primary key,
      name text not null unique,
      updated_at timestamptz not null default now()
    )`)
  await db.execute(sql`drop trigger if exists e2e_items_set_updated_at on e2e_items`)
  await db.execute(sql`
    create trigger e2e_items_set_updated_at before update on e2e_items
    for each row execute function set_updated_at()`)
})
afterAll(async () => {
  await db.execute(sql`drop table if exists e2e_items`)
  await app.close()
})

const http = () => request(app.getHttpServer())

test('/health/ready: DB trả lời thì 200', async () => {
  const res = await http().get('/health/ready').expect(200)
  expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } })
})

test('migration đầu tạo extension citext, pgcrypto và hàm set_updated_at', async () => {
  const extensions = await db.execute<{ extname: string }>(
    sql`select extname from pg_extension where extname in ('citext', 'pgcrypto') order by 1`,
  )
  expect(extensions.map((r) => r.extname)).toEqual(['citext', 'pgcrypto'])
  const fn = await db.execute(sql`select 1 from pg_proc where proname = 'set_updated_at'`)
  expect(fn).toHaveLength(1)
})

test('trigger set_updated_at đổi updated_at khi sửa dòng', async () => {
  const [row] = await db.execute<{ id: number; updated_at: Date }>(
    sql`insert into e2e_items (name) values ('trigger') returning id, updated_at`,
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  const [updated] = await db.execute<{ updated_at: Date }>(
    sql`update e2e_items set name = 'trigger 2' where id = ${row!.id} returning updated_at`,
  )
  expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
    new Date(row!.updated_at).getTime(),
  )
})

test('transaction lỗi thì không ghi gì', async () => {
  await expect(
    db.transaction(async (tx) => {
      await tx.execute(sql`insert into e2e_items (name) values ('rollback')`)
      throw new Error('hủy giữa chừng')
    }),
  ).rejects.toThrow('hủy giữa chừng')
  const rows = await db.execute(sql`select 1 from e2e_items where name = 'rollback'`)
  expect(rows).toHaveLength(0)
})

test('trùng khóa unique thật từ Postgres: 409 conflict qua filter', async () => {
  await http().post('/v1/test-db/items').send({ name: 'trung' }).expect(201)
  const res = await http().post('/v1/test-db/items').send({ name: 'trung' }).expect(409)
  expect(res.body).toEqual({
    statusCode: 409,
    error: { code: 'conflict', message: 'Conflict with the current state' },
    meta: { requestId: expect.any(String) },
  })
})
