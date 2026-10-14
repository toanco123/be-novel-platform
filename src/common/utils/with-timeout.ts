/** Chờ `promise` tối đa `ms` mili giây; quá thì lỗi `timeout`. Luôn dọn timer khi xong */
export async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
