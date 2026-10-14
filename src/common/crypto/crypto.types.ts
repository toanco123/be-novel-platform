/** Kết quả so mật khẩu; needsRehash: hash cũ (bcrypt) đúng, cần băm lại bằng argon2id */
export type PasswordCheck = { ok: boolean; needsRehash: boolean }
