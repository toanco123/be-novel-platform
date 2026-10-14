import { envSchema } from '@/config/env.schema'
import { validateEnv } from '@/config/validate-env'

const DATABASE_URL = 'postgres://novel:novel@localhost:5433/novel'
const REDIS_URL = 'redis://localhost:6380'

test('mặc định hợp lý khi chỉ đặt biến bắt buộc', () => {
  expect(envSchema.parse({ DATABASE_URL, REDIS_URL })).toEqual({
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
    REDIS_URL,
    THROTTLE_LIMIT: 300,
    THROTTLE_TTL_SECONDS: 60,
    JWT_KEY_ID: 'dev',
    JWT_ISSUER: 'novel-api',
    JWT_AUDIENCE: 'novel-clients',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
  })
})

test('tách danh sách CORS, đổi kiểu số và cờ', () => {
  const env = validateEnv({
    DATABASE_URL,
    REDIS_URL,
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
  expect(() => validateEnv({ REDIS_URL })).toThrow(/DATABASE_URL/)
  expect(() => validateEnv({ REDIS_URL, DATABASE_URL: 'mysql://x' })).toThrow(/postgres/)
  expect(() => validateEnv({ DATABASE_URL, REDIS_URL: 'http://x' })).toThrow(/redis/)
})

test('biến sai thì dừng và báo rõ biến nào', () => {
  expect(() => validateEnv({ PORT: 'abc', NODE_ENV: 'staging' })).toThrow(
    /PORT[\s\S]*NODE_ENV|NODE_ENV[\s\S]*PORT/,
  )
})

test('production thiếu khóa JWT thì dừng; có đủ thì qua', () => {
  expect(() => validateEnv({ DATABASE_URL, REDIS_URL, NODE_ENV: 'production' })).toThrow(
    /JWT_PRIVATE_KEY/,
  )
  expect(
    validateEnv({
      DATABASE_URL,
      REDIS_URL,
      NODE_ENV: 'production',
      JWT_PRIVATE_KEY: 'pem',
      JWT_PUBLIC_KEY: 'pem',
    }).NODE_ENV,
  ).toBe('production')
})

test('biến để trống trong .env coi như không đặt', () => {
  const env = validateEnv({
    DATABASE_URL,
    REDIS_URL,
    COOKIE_SECURE: '',
    JWT_PRIVATE_KEY: '',
    PORT: '',
  })
  expect(env.COOKIE_SECURE).toBeUndefined()
  expect(env.JWT_PRIVATE_KEY).toBeUndefined()
  expect(env.PORT).toBe(4000)
})
