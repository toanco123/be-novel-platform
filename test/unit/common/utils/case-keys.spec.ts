import { camelCaseKeys, toCamelCase } from '@/common/utils/case-keys'

describe('toCamelCase', () => {
  it('snake_case → camelCase; khóa khác giữ nguyên', () => {
    expect(toCamelCase('display_name')).toBe('displayName')
    expect(toCamelCase('refresh_token_2')).toBe('refreshToken2')
    expect(toCamelCase('displayName')).toBe('displayName')
    expect(toCamelCase('email')).toBe('email')
    expect(toCamelCase('_private')).toBe('_private')
    expect(toCamelCase('USER_ID')).toBe('USER_ID')
  })
})

describe('camelCaseKeys', () => {
  it('đổi cả object con và mảng; giá trị giữ nguyên', () => {
    expect(
      camelCaseKeys({
        display_name: 'Linh',
        profile: { avatar_url: null, tags: ['a_b'] },
        items: [{ chapter_id: 1 }, 'x_y'],
      }),
    ).toEqual({
      displayName: 'Linh',
      profile: { avatarUrl: null, tags: ['a_b'] },
      items: [{ chapterId: 1 }, 'x_y'],
    })
  })

  it('gửi cả hai dạng thì camelCase thắng, không phụ thuộc thứ tự', () => {
    expect(camelCaseKeys({ display_name: 'snake', displayName: 'camel' })).toEqual({
      displayName: 'camel',
    })
    expect(camelCaseKeys({ displayName: 'camel', display_name: 'snake' })).toEqual({
      displayName: 'camel',
    })
  })

  it('bỏ khóa nguy hiểm, không đổi prototype', () => {
    const input = JSON.parse('{"__proto__": {"isAdmin": true}, "constructor": 1, "ok_key": 1}')
    const result = camelCaseKeys(input) as Record<string, unknown>
    expect(result).toEqual({ okKey: 1 })
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined()
  })

  it('giá trị không phải object thuần giữ nguyên', () => {
    const date = new Date()
    expect(camelCaseKeys(date)).toBe(date)
    expect(camelCaseKeys(null)).toBeNull()
    expect(camelCaseKeys('a_b')).toBe('a_b')
  })
})
