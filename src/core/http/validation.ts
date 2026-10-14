// Validate body / query bằng class-validator: DTO là class có decorator (@IsEmail, @Length...).
// Lỗi luôn thành 400 validation_failed kèm details.issues = [{ path, code, message }] để client hiện
// cạnh ô nhập (code là tên ràng buộc của class-validator, vd isEmail, isLength).
import { type ValidationError, ValidationPipe } from '@nestjs/common'
import { AppError } from '../errors/app-error'

export type ValidationIssue = { path: string; code: string; message: string }

/** Cây lỗi của class-validator → danh sách phẳng, đường dẫn nối bằng dấu chấm (vd items.0.name) */
export function toValidationIssues(errors: ValidationError[], parent = ''): ValidationIssue[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property
    const own = Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      path,
      code,
      message,
    }))
    return [...own, ...toValidationIssues(error.children ?? [], path)]
  })
}

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
