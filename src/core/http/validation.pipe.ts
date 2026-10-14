// Validate body / query bằng class-validator: DTO là class có decorator (@IsEmail, @Length...).
// Lỗi luôn thành 400 validation_failed kèm details.issues = [{ path, code, message }] để client hiện
// cạnh ô nhập (code là tên ràng buộc của class-validator, vd isEmail, isLength).
import { ValidationPipe } from '@nestjs/common'
import { AppError } from '../errors/app-error'
import { toValidationIssues } from './validation-issues'

/** Pipe toàn cục (CoreModule) */
export function createValidationPipe() {
  return new ValidationPipe({
    // Bỏ các trường không khai báo trong DTO
    whitelist: true,
    // Trả instance của DTO (chạy @Transform: trim, chữ thường...)
    transform: true,
    // Không tự đổi kiểu theo kiểu TypeScript ("1" → 1): DTO tự khai báo @Type / @Transform khi cần
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new AppError('validation_failed', { issues: toValidationIssues(errors) }),
  })
}
