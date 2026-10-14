// Khóa ký access token (ES256, PEM): sinh cặp khóa mới, đọc khóa từ env.
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose'
import { JWT_ALG } from '../auth/auth.constants'

/**
 * PEM trong env: "\n" có thể là chuỗi hai ký tự; vài nơi (docker --env-file, trang cấu hình của
 * nơi deploy) giữ nguyên dấu nháy bao quanh giá trị
 */
export const normalizePem = (value: string) =>
  value
    .trim()
    .replace(/^(["'])([\s\S]*)\1$/, '$2')
    .replace(/\\n/g, '\n')
    .trim()

/** Sinh cặp khóa ES256 dạng PEM (script keys:generate) */
export async function generatePemKeyPair() {
  const { privateKey, publicKey } = await generateKeyPair(JWT_ALG, { extractable: true })
  return { privateKey: await exportPKCS8(privateKey), publicKey: await exportSPKI(publicKey) }
}
