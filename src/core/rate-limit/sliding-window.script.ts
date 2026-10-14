// Script Lua cửa sổ trượt: mỗi lượt là một phần tử sorted set (điểm = thời điểm); đếm và ghi
// nguyên tử nên nhiều instance cùng lúc vẫn đúng.
// KEYS[1] key; ARGV: now(ms), window(ms), limit, member, consume(1|0) → { allowed, used, retryAfterMs }
export const SLIDING_WINDOW_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local used = redis.call('ZCARD', KEYS[1])
if used < limit then
  if ARGV[5] == '1' then
    redis.call('ZADD', KEYS[1], now, ARGV[4])
    redis.call('PEXPIRE', KEYS[1], window)
    used = used + 1
  end
  return { 1, used, 0 }
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return { 0, used, tonumber(oldest[2]) + window - now }
`
