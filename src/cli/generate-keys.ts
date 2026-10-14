// In ra một cặp khóa ES256 (PEM) cho JWT_PRIVATE_KEY / JWT_PUBLIC_KEY: npm run keys:generate.
// Dòng env dùng "\n" thay xuống dòng để dán vào .env hoặc biến môi trường của nơi deploy.
import { generatePemKeyPair } from '@/core/auth/jwt-keys'

const oneLine = (pem: string) => JSON.stringify(pem.trim()).slice(1, -1)

async function main() {
  const { privateKey, publicKey } = await generatePemKeyPair()
  const lines = [
    `JWT_PRIVATE_KEY="${oneLine(privateKey)}"`,
    `JWT_PUBLIC_KEY="${oneLine(publicKey)}"`,
    `JWT_KEY_ID=${new Date().toISOString().slice(0, 10)}`,
  ]
  process.stdout.write(`${lines.join('\n')}\n`)
}

void main()
