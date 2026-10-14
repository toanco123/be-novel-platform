// Validate body / query bằng class-validator: DTO là class có decorator (@IsEmail, @Length...).
// Lỗi thành 400 validation_failed (errors/validation-exception.factory.ts).
import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from '../errors/validation-exception.factory'

/** Pipe toàn cục (CommonModule) */
export function createValidationPipe() {
  return new ValidationPipe({
    // Bỏ các trường không khai báo trong DTO
    whitelist: true,
    // Trả instance của DTO (chạy @Transform: trim, chữ thường...)
    transform: true,
    // Không tự đổi kiểu theo kiểu TypeScript ("1" → 1): DTO tự khai báo @Type / @Transform khi cần
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: validationExceptionFactory,
  })
}
