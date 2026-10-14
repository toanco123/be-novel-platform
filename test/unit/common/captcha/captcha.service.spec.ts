import { CaptchaService } from '@/common/captcha/captcha.service'
import type { AppConfig } from '@/config/app-config.service'

const service = (secret?: string) =>
  new CaptchaService({ get: () => secret } as unknown as AppConfig)

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const respond = (body: object) => fetchMock.mockResolvedValue(Response.json(body))

describe('CaptchaService', () => {
  it('không đặt TURNSTILE_SECRET: tắt, không gọi Cloudflare', async () => {
    await expect(service().verify(undefined, '1.2.3.4')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('thiếu hoặc sai kiểu token → invalid_captcha, không gọi Cloudflare', async () => {
    for (const token of [undefined, '', 123, 'x'.repeat(2049)]) {
      await expect(service('secret').verify(token, null)).rejects.toMatchObject({
        code: 'invalid_captcha',
      })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('Cloudflare xác nhận đúng: qua; gửi secret, token và IP', async () => {
    respond({ success: true })
    await service('secret').verify('token-ok', '1.2.3.4')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(Object.fromEntries(init!.body as URLSearchParams)).toEqual({
      secret: 'secret',
      response: 'token-ok',
      remoteip: '1.2.3.4',
    })
  })

  it('Cloudflare báo sai → invalid_captcha kèm lý do', async () => {
    respond({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    await expect(service('secret').verify('token-cu', null)).rejects.toMatchObject({
      code: 'invalid_captcha',
      details: { reasons: ['timeout-or-duplicate'] },
    })
  })

  it('Cloudflare không trả lời → service_unavailable (không cho qua)', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    await expect(service('secret').verify('token', null)).rejects.toMatchObject({
      code: 'service_unavailable',
    })
  })
})
