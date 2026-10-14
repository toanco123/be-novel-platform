import { hash as bcryptHash } from 'bcryptjs'
import { PasswordService } from './password.service'

describe('PasswordService', () => {
  const passwords = new PasswordService()

  it('băm bằng argon2id, xác minh đúng / sai', async () => {
    const hash = await passwords.hash('mat-khau-dung')
    expect(hash).toMatch(/^\$argon2id\$/)
    expect(await passwords.verify('mat-khau-dung', hash)).toEqual({ ok: true, needsRehash: false })
    expect(await passwords.verify('mat-khau-sai', hash)).toEqual({ ok: false, needsRehash: false })
  })

  it('hash bcrypt cũ (Supabase) đúng thì cần băm lại', async () => {
    const legacy = await bcryptHash('mat-khau-cu', 4)
    expect(await passwords.verify('mat-khau-cu', legacy)).toEqual({ ok: true, needsRehash: true })
    expect(await passwords.verify('khac', legacy)).toEqual({ ok: false, needsRehash: false })
  })

  it('nhận cả tiền tố $2a$ của Supabase', async () => {
    const legacy = (await bcryptHash('mat-khau-cu', 4)).replace(/^\$2b\$/, '$2a$')
    expect((await passwords.verify('mat-khau-cu', legacy)).ok).toBe(true)
  })

  it('hash lạ hoặc rỗng thì sai', async () => {
    expect((await passwords.verify('x', 'plaintext')).ok).toBe(false)
    expect((await passwords.verify('x', '')).ok).toBe(false)
  })

  it('so với hash giả luôn sai', async () => {
    expect(await passwords.verifyDummy('dummy-password-for-timing')).toEqual({
      ok: false,
      needsRehash: false,
    })
  })
})
