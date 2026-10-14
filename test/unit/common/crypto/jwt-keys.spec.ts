import { generatePemKeyPair, normalizePem } from '@/common/crypto/jwt-keys'

describe('normalizePem', () => {
  it('PEM viết một dòng ("\\n"), có hoặc không có dấu nháy bao quanh → PEM gốc', async () => {
    const { privateKey } = await generatePemKeyPair()
    const oneLine = privateKey.trim().replace(/\n/g, '\\n')
    expect(normalizePem(oneLine)).toBe(privateKey.trim())
    expect(normalizePem(`"${oneLine}"`)).toBe(privateKey.trim())
    expect(normalizePem(`  '${oneLine}'  `)).toBe(privateKey.trim())
    expect(normalizePem(privateKey)).toBe(privateKey.trim())
  })
})
