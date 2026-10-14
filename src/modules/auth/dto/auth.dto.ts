import { z } from 'zod'
import { createZodDto } from '@/core/http/zod-dto'
import { displayNameSchema, meSchema } from '@/modules/users/dto/me.dto'

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254))
  .meta({ format: 'email', maxLength: 254, example: 'linh@example.com' })

/** Giống form của web: 8–72 ký tự (72 là giới hạn của bcrypt) */
const newPasswordSchema = z.string().min(8).max(72).meta({ example: 'mat-khau-bi-mat' })

export class RegisterDto extends createZodDto(
  z.object({
    email: emailSchema,
    password: newPasswordSchema,
    displayName: displayNameSchema.meta({ example: 'Linh' }),
  }),
) {}

export class LoginDto extends createZodDto(
  z.object({
    email: emailSchema,
    // Không bắt tối thiểu 8: user chuyển từ Supabase có thể có mật khẩu ngắn hơn
    password: z.string().min(1).max(128).meta({ example: 'mat-khau-bi-mat' }),
  }),
) {}

/** Body của /refresh và /logout: mobile gửi token ở đây, web để trống (dùng cookie) */
export class RefreshTokenDto extends createZodDto(
  z
    .object({
      refreshToken: z.string().min(1).max(256).optional().meta({
        description: 'Chỉ mobile gửi; web để trống, token nằm trong cookie refresh_token',
      }),
    })
    .default({}),
) {}

export const authSessionSchema = z.object({
  user: meSchema,
  accessToken: z.string().meta({
    description: 'JWT gửi kèm mọi request: Authorization: Bearer <accessToken>',
    example: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldiIsInR5cCI6IkpXVCJ9...',
  }),
  expiresIn: z
    .number()
    .int()
    .meta({ description: 'Access token còn hiệu lực (giây)', example: 900 }),
  refreshToken: z.string().optional().meta({
    description: 'Chỉ có khi gửi header X-Client: mobile; web nhận trong cookie HttpOnly',
  }),
})

export class AuthSessionDto extends createZodDto(authSessionSchema) {}
