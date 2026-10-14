import type { Actor } from '@/common/auth/auth.types'
import { TokenService } from '@/common/auth/token.service'
import { generatePemKeyPair } from '@/common/crypto/jwt-keys'
import type { AppConfig } from '@/config/app-config.service'
import type { Env } from '@/config/config.types'

const actor: Actor = {
  id: '6f1c2a54-8a43-4c5e-9b7f-3c8f0d2e1a11',
  role: 'admin',
  sessionId: '0b8e7f7e-2d51-4d1a-a1f3-5f0f6a8c9d22',
}

async function createService(overrides: Partial<Env> = {}) {
  const values: Partial<Env> = {
    NODE_ENV: 'test',
    JWT_KEY_ID: 'test',
    JWT_ISSUER: 'novel-api',
    JWT_AUDIENCE: 'novel-clients',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    ...overrides,
  }
  const config = { get: (key: keyof Env) => values[key] } as unknown as AppConfig
  const service = new TokenService(config)
  await service.onModuleInit()
  return service
}

const invalidToken = { code: 'invalid_token' }

afterEach(() => {
  vi.useRealTimers()
})

describe('TokenService', () => {
  it('ký rồi xác minh ra đúng người gọi', async () => {
    const tokens = await createService()
    const token = await tokens.signAccessToken(actor)
    expect(await tokens.verifyAccessToken(token)).toEqual(actor)
  })

  it('header có alg ES256 và kid', async () => {
    const tokens = await createService({ JWT_KEY_ID: 'k-2026' })
    const header = JSON.parse(
      Buffer.from((await tokens.signAccessToken(actor)).split('.')[0]!, 'base64url').toString(),
    )
    expect(header).toMatchObject({ alg: 'ES256', kid: 'k-2026', typ: 'JWT' })
  })

  it('token hết hạn → invalid_token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const tokens = await createService({ ACCESS_TOKEN_TTL_SECONDS: 60 })
    const token = await tokens.signAccessToken(actor)
    vi.setSystemTime(Date.now() + 61_000)
    await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject(invalidToken)
  })

  it('sai chữ ký (khóa khác) → invalid_token', async () => {
    const a = await createService()
    const b = await createService()
    await expect(b.verifyAccessToken(await a.signAccessToken(actor))).rejects.toMatchObject(
      invalidToken,
    )
  })

  it('cùng khóa nhưng sai audience hoặc issuer → invalid_token', async () => {
    const { privateKey, publicKey } = await generatePemKeyPair()
    // Khóa trong env viết "\n" thành hai ký tự
    const keys = {
      JWT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
      JWT_PUBLIC_KEY: publicKey.replace(/\n/g, '\\n'),
    }
    const signer = await createService(keys)
    const token = await signer.signAccessToken(actor)
    expect(await (await createService(keys)).verifyAccessToken(token)).toEqual(actor)
    await expect(
      (await createService({ ...keys, JWT_AUDIENCE: 'other' })).verifyAccessToken(token),
    ).rejects.toMatchObject(invalidToken)
    await expect(
      (await createService({ ...keys, JWT_ISSUER: 'other' })).verifyAccessToken(token),
    ).rejects.toMatchObject(invalidToken)
  })

  it('chuỗi rác → invalid_token', async () => {
    const tokens = await createService()
    for (const token of ['khong-phai-jwt', 'a.b.c', '']) {
      await expect(tokens.verifyAccessToken(token)).rejects.toMatchObject(invalidToken)
    }
  })
})
