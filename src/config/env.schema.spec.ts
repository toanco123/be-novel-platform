import { envSchema, validateEnv } from './env.schema'

const DATABASE_URL = 'postgres://novel:novel@localhost:5433/novel'

test('mặc định hợp lý khi chỉ đặt biến bắt buộc', () => {
  expect(envSchema.parse({ DATABASE_URL })).toEqual({
    NODE_ENV: 'development',
    HOST: '0.0.0.0',
    PORT: 4000,
    LOG_LEVEL: 'info',
    CORS_ORIGINS: [],
    TRUST_PROXY_HOPS: 0,
    SWAGGER_ENABLED: true,
    DATABASE_URL,
    DB_POOL_MAX: 10,
    DB_STATEMENT_TIMEOUT_MS: 15_000,
  })
})

test('tách danh sách CORS, đổi kiểu số và cờ', () => {
  const env = validateEnv({
    DATABASE_URL,
    PORT: '8080',
    CORS_ORIGINS: ' http://a.test , ,https://b.test',
    TRUST_PROXY_HOPS: '1',
    SWAGGER_ENABLED: '0',
  })
  expect(env).toMatchObject({
    PORT: 8080,
    CORS_ORIGINS: ['http://a.test', 'https://b.test'],
    TRUST_PROXY_HOPS: 1,
    SWAGGER_ENABLED: false,
  })
})

test('thiếu DATABASE_URL hoặc sai dạng thì dừng', () => {
  expect(() => validateEnv({})).toThrow(/DATABASE_URL/)
  expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/postgres/)
})

test('biến sai thì dừng và báo rõ biến nào', () => {
  expect(() => validateEnv({ PORT: 'abc', NODE_ENV: 'staging' })).toThrow(
    /PORT[\s\S]*NODE_ENV|NODE_ENV[\s\S]*PORT/,
  )
})
