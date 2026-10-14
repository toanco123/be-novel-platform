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
    SMTP_URL: 'smtp://localhost:1025',
    MAIL_FROM: 'Web Truyện <no-reply@novel.local>',
    APP_WEB_URL: 'http://localhost:3000',
    API_PUBLIC_URL: 'http://localhost:4000',
    OAUTH_REDIRECT_URLS: [],
    APPLE_CLIENT_IDS: [],
    S3_ENDPOINT: 'http://localhost:9010',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'novel',
    S3_SECRET_ACCESS_KEY: 'novel-secret',
    S3_BUCKET: 'novel',
    S3_PUBLIC_URL: 'http://localhost:9010/novel',
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

test('production thiếu khóa JWT, SMTP, link web thì dừng; có đủ thì qua', () => {
  const production = {
    DATABASE_URL,
    REDIS_URL,
    NODE_ENV: 'production',
    JWT_PRIVATE_KEY: 'pem',
    JWT_PUBLIC_KEY: 'pem',
    SMTP_URL: 'smtps://user:pass@smtp.example.com:465',
    APP_WEB_URL: 'https://novel.example.com',
    API_PUBLIC_URL: 'https://api.novel.example.com',
    S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    S3_PUBLIC_URL: 'https://img.novel.example.com',
  }
  expect(validateEnv(production).NODE_ENV).toBe('production')
  const { JWT_PRIVATE_KEY: _key, ...noJwt } = production
  expect(() => validateEnv(noJwt)).toThrow(/JWT_PRIVATE_KEY/)
  // Để mặc định của dev (localhost) thì dừng
  const { SMTP_URL: _smtp, APP_WEB_URL: _web, ...devDefaults } = production
  expect(() => validateEnv(devDefaults)).toThrow(/SMTP_URL[\s\S]*APP_WEB_URL/)
})

test('SMTP_URL, APP_WEB_URL sai dạng thì dừng', () => {
  expect(() => validateEnv({ DATABASE_URL, REDIS_URL, SMTP_URL: 'http://x' })).toThrow(/SMTP_URL/)
  expect(() => validateEnv({ DATABASE_URL, REDIS_URL, APP_WEB_URL: 'khong-phai-url' })).toThrow(
    /APP_WEB_URL/,
  )
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
