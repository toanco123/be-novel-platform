import { envSchema, validateEnv } from './env.schema'

test('mặc định hợp lý khi không đặt biến nào', () => {
  expect(envSchema.parse({})).toEqual({
    NODE_ENV: 'development',
    HOST: '0.0.0.0',
    PORT: 4000,
    LOG_LEVEL: 'info',
    CORS_ORIGINS: [],
    TRUST_PROXY_HOPS: 0,
    SWAGGER_ENABLED: true,
  })
})

test('tách danh sách CORS, đổi kiểu số và cờ', () => {
  const env = validateEnv({
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

test('biến sai thì dừng và báo rõ biến nào', () => {
  expect(() => validateEnv({ PORT: 'abc', NODE_ENV: 'staging' })).toThrow(
    /PORT[\s\S]*NODE_ENV|NODE_ENV[\s\S]*PORT/,
  )
})
