import { applyDecorators } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import type { ErrorCode } from '@/common/errors/errors.types'
import { ERROR_CODES } from '../errors/error-code'
import { ErrorResponseDto } from '../errors/dto/error-response.dto'

/** `details` mẫu của vài mã lỗi (hiện trong ví dụ của Swagger) */
const EXAMPLE_DETAILS: Partial<Record<ErrorCode, Record<string, unknown>>> = {
  validation_failed: {
    issues: [
      {
        path: 'password',
        code: 'too_small',
        message: 'Too small: expected string to have >=8 characters',
      },
    ],
  },
  rate_limited: { retryAfterSeconds: 42 },
  account_banned: { bannedUntil: '2026-12-31T00:00:00.000Z' },
}

/**
 * Ghi vào Swagger các mã lỗi một endpoint có thể trả (gộp theo HTTP status, mỗi mã một ví dụ),
 * dạng lỗi chung { statusCode, error: { code, message, details? }, meta }.
 * Vd @ApiErrorResponses('invalid_credentials', 'rate_limited')
 */
export function ApiErrorResponses(...codes: ErrorCode[]) {
  const byStatus = new Map<number, ErrorCode[]>()
  for (const code of codes) {
    const status = ERROR_CODES[code].status
    byStatus.set(status, [...(byStatus.get(status) ?? []), code])
  }
  return applyDecorators(
    ...[...byStatus].map(([status, list]) =>
      ApiResponse({
        status,
        description: `code: ${list.map((code) => `\`${code}\``).join(', ')}`,
        type: ErrorResponseDto,
        examples: Object.fromEntries(
          list.map((code) => [
            code,
            {
              summary: code,
              value: {
                statusCode: status,
                error: {
                  code,
                  message: ERROR_CODES[code].message,
                  ...(EXAMPLE_DETAILS[code] && { details: EXAMPLE_DETAILS[code] }),
                },
                meta: { requestId: '0b8e7f7e-2d51-4d1a-a1f3-5f0f6a8c9d22' },
              },
            },
          ]),
        ),
      }),
    ),
  )
}
