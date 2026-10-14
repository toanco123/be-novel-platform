import type { ValidationError } from '@nestjs/common'
import type { ValidationIssue } from './http.types'

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
