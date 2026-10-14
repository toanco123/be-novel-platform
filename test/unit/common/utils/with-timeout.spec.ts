import { withTimeout } from '@/common/utils/with-timeout'

afterEach(() => {
  vi.useRealTimers()
})

describe('withTimeout', () => {
  it('xong trước hạn thì trả kết quả', async () => {
    expect(await withTimeout(Promise.resolve('ok'), 1000)).toBe('ok')
  })

  it('quá hạn thì lỗi timeout', async () => {
    vi.useFakeTimers()
    const result = withTimeout(new Promise(() => {}), 2000)
    vi.advanceTimersByTime(2000)
    await expect(result).rejects.toThrow('timeout')
  })

  it('lỗi của promise được giữ nguyên', async () => {
    await expect(withTimeout(Promise.reject(new Error('hỏng')), 1000)).rejects.toThrow('hỏng')
  })
})
