// Lỗi của class-validator → 400 validation_failed, details.issues = [{ path, code, message }]
// (code là tên ràng buộc, vd isEmail, isLength). Dùng làm exceptionFactory của ValidationPipe.
import type { ValidationError } from '@nestjs/common'
import { AppException } from './app.exception'
import type { ValidationIssue } from './errors.types'

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

/** exceptionFactory của ValidationPipe */
export const validationExceptionFactory = (errors: ValidationError[]) =>
  new AppException('validation_failed', { issues: toValidationIssues(errors) })
