import { z } from 'zod'
import { createZodDto } from '@/core/http/zod-dto'

/** Tên hiển thị: 2–50 ký tự sau khi bỏ khoảng trắng ở hai đầu (giống web) */
export const displayNameSchema = z.string().trim().min(2).max(50)

export const meSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().meta({ example: 'Linh' }),
  avatarUrl: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
})

export class MeDto extends createZodDto(meSchema) {}

export class UpdateMeDto extends createZodDto(
  z.object({ displayName: displayNameSchema.meta({ example: 'Linh Nguyễn' }) }),
) {}
