/** Token inject client Redis dùng chung (rate limit, health): @Inject(REDIS) redis: Redis */
export const REDIS = Symbol('REDIS')

/** /health/ready: Redis phải trả lời PING trong khoảng này */
export const REDIS_HEALTH_TIMEOUT_MS = 2000
