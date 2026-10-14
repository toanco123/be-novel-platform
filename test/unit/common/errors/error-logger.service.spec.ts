import type { ClsService } from 'nestjs-cls'
import type { PinoLogger } from 'nestjs-pino'
import { AppException } from '@/common/errors/app.exception'
import { ErrorLogger } from '@/common/errors/error-logger.service'

function setup(cls: Partial<ClsService> = { isActive: () => false }) {
  const logger = {
    setContext: vi.fn<(context: string) => void>(),
    error: vi.fn<(obj: unknown, msg?: string) => void>(),
    warn: vi.fn<(obj: unknown, msg?: string) => void>(),
  }
  const errors = new ErrorLogger(logger as unknown as PinoLogger, cls as ClsService)
  return { logger, errors }
}

describe('ErrorLogger', () => {
  it('lỗi ngoài dự kiến: mức error, kèm err (stack), thông điệp gốc và context', () => {
    const { logger, errors } = setup()
    const boom = new Error('mất kết nối')
    errors.log(boom, { queue: 'system', jobId: '1' })
    expect(logger.error).toHaveBeenCalledWith(
      {
        error: { code: 'internal_error', status: 500, message: 'Internal server error' },
        err: boom,
        queue: 'system',
        jobId: '1',
      },
      'mất kết nối',
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('AppException 4xx: mức warn, có details, không kèm stack', () => {
    const { logger, errors } = setup()
    errors.log(new AppException('rate_limited', { retryAfterSeconds: 5 }))
    expect(logger.warn).toHaveBeenCalledWith(
      {
        error: {
          code: 'rate_limited',
          status: 429,
          message: 'Too many requests, try again later',
          details: { retryAfterSeconds: 5 },
        },
      },
      'Too many requests, try again later',
    )
  })

  it('AppException 5xx vẫn mức error và kèm err', () => {
    const { logger, errors } = setup()
    const timeout = new AppException('timeout')
    errors.log(timeout)
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'timeout' }),
        err: timeout,
      }),
      'The request took too long',
    )
  })

  it('đang trong request: tự gắn requestId và userId', () => {
    const { logger, errors } = setup({
      isActive: () => true,
      getId: () => 'req-1',
      get: (() => ({ id: 'u1', role: 'user', sessionId: 's1' })) as ClsService['get'],
    })
    errors.log(new Error('x'))
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-1', userId: 'u1' }),
      'x',
    )
  })
})
