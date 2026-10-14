// Luật mật khẩu mới (đăng ký, đặt lại, đổi mật khẩu), giống form của web và app: 8–72 ký tự (72 là
// giới hạn của bcrypt), có ít nhất một chữ cái và một chữ số. Đăng nhập không dùng luật này.
import { applyDecorators } from '@nestjs/common'
import { IsString, Length, ValidateBy } from 'class-validator'

const rule = (name: string, pattern: RegExp, message: string) =>
  ValidateBy({
    name,
    validator: {
      validate: (value: unknown) => typeof value === 'string' && pattern.test(value),
      defaultMessage: () => message,
    },
  })

/** Lỗi có mã riêng: isLength, hasLetter, hasDigit (client biết thiếu gì) */
export const IsNewPassword = () =>
  applyDecorators(
    IsString(),
    Length(8, 72),
    rule('hasLetter', /\p{L}/u, '$property must contain at least one letter'),
    rule('hasDigit', /\d/, '$property must contain at least one digit'),
  )
