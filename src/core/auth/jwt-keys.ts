// Khóa ký access token (ES256, PEM): sinh cặp khóa mới, đọc khóa từ env.
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose'
import { JWT_ALG } from './auth.constants'

/** PEM trong env có thể viết "\n" thành chuỗi hai ký tự */
export const normalizePem = (value: string) => value.replace(/\\n/g, '\n').trim()

/** Sinh cặp khóa ES256 dạng PEM (script keys:generate) */
export async function generatePemKeyPair() {
  const { privateKey, publicKey } = await generateKeyPair(JWT_ALG, { extractable: true })
  return { privateKey: await exportPKCS8(privateKey), publicKey: await exportSPKI(publicKey) }
}
