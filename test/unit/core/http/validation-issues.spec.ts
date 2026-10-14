import type { ValidationError } from '@nestjs/common'
import { toValidationIssues } from '@/core/http/validation-issues'

describe('toValidationIssues', () => {
  it('làm phẳng cây lỗi', () => {
    const errors: ValidationError[] = [
      {
        property: 'profile',
        children: [{ property: 'name', constraints: { isString: 'name must be a string' } }],
      },
    ]
    expect(toValidationIssues(errors)).toEqual([
      { path: 'profile.name', code: 'isString', message: 'name must be a string' },
    ])
  })
})
