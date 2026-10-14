import { IpHashService } from '@/common/crypto/ip-hash.service'
import type { AppConfig } from '@/config/app-config.service'

const withSecret = (secret: string | undefined) =>
  new IpHashService({ get: () => secret } as unknown as AppConfig)

describe('IpHashService', () => {
  it('cùng IP, cùng khóa → cùng hash; không chứa IP gốc', () => {
    const service = withSecret('k'.repeat(32))
    const hash = service.hash('10.0.0.1')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(service.hash('10.0.0.1')).toBe(hash)
    expect(service.hash('10.0.0.2')).not.toBe(hash)
  })

  it('khác khóa → khác hash; không đặt khóa thì dùng khóa dev cố định', () => {
    expect(withSecret('a'.repeat(32)).hash('10.0.0.1')).not.toBe(
      withSecret('b'.repeat(32)).hash('10.0.0.1'),
    )
    expect(withSecret(undefined).hash('10.0.0.1')).toBe(withSecret(undefined).hash('10.0.0.1'))
  })
})
