import type { ArgumentMetadata, ValidationError } from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsInt, IsString, Length, ValidateNested } from 'class-validator'
import { AppError } from '@/core/errors/app-error'
import { createValidationPipe, toValidationIssues } from '@/core/http/validation'
import { LoginDto, RefreshTokenDto, RegisterDto } from '@/modules/auth/dto/auth.dto'

const pipe = createValidationPipe()
const body = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
})

/** Lỗi validate mà pipe ném ra (AppError validation_failed) */
async function validationError(value: unknown, metatype: ArgumentMetadata['metatype']) {
  const error = await pipe.transform(value, body(metatype)).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(AppError)
  expect(error).toMatchObject({ code: 'validation_failed' })
  return (error as AppError).details!.issues
}

class ItemDto {
  @IsString()
  @Length(1, 10)
  name!: string
}

class OrderDto {
  @IsInt()
  quantity!: number

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[]
}

describe('ValidationPipe toàn cục', () => {
  it('chuẩn hóa: email bỏ khoảng trắng, chữ thường; tên bỏ khoảng trắng; bỏ trường lạ', async () => {
    const result = await pipe.transform(
      {
        email: '  Linh@Example.COM ',
        password: 'mat-khau-bi-mat',
        displayName: '  Linh ',
        role: 'admin',
      },
      body(RegisterDto),
    )
    expect(result).toBeInstanceOf(RegisterDto)
    expect({ ...result }).toEqual({
      email: 'linh@example.com',
      password: 'mat-khau-bi-mat',
      displayName: 'Linh',
    })
  })

  it('sai thì validation_failed, mỗi lỗi { path, code, message }', async () => {
    const issues = await validationError(
      { email: 'khong-phai-email', password: 'ngan' },
      RegisterDto,
    )
    expect(issues).toEqual(
      expect.arrayContaining([
        { path: 'email', code: 'isEmail', message: expect.any(String) },
        { path: 'password', code: 'isLength', message: expect.any(String) },
        { path: 'displayName', code: 'isString', message: expect.any(String) },
      ]),
    )
  })

  it('tên chỉ có khoảng trắng → sai độ dài (trim trước khi validate)', async () => {
    const issues = await validationError(
      { email: 'a@b.co', password: 'mat-khau-bi-mat', displayName: '   ' },
      RegisterDto,
    )
    expect(issues).toEqual([expect.objectContaining({ path: 'displayName', code: 'isLength' })])
  })

  it('không đổi kiểu ngầm: chuỗi "5" không thành số', async () => {
    const issues = await validationError({ quantity: '5', items: [] }, OrderDto)
    expect(issues).toEqual([expect.objectContaining({ path: 'quantity', code: 'isInt' })])
  })

  it('lỗi trong mảng / object con có đường dẫn đầy đủ', async () => {
    const issues = await validationError(
      { quantity: 1, items: [{ name: 'ok' }, { name: '' }] },
      OrderDto,
    )
    expect(issues).toEqual([expect.objectContaining({ path: 'items.1.name', code: 'isLength' })])
  })

  it('không gửi body với DTO toàn trường tùy chọn: qua, thành DTO rỗng', async () => {
    expect(await pipe.transform(undefined, body(RefreshTokenDto))).toEqual(new RefreshTokenDto())
    expect(await pipe.transform({}, body(RefreshTokenDto))).toBeInstanceOf(RefreshTokenDto)
  })

  it('đăng nhập không bắt mật khẩu tối thiểu 8 ký tự (user cũ của Supabase)', async () => {
    const result = await pipe.transform({ email: 'a@b.co', password: '123456' }, body(LoginDto))
    expect(result).toMatchObject({ password: '123456' })
  })
})

describe('toValidationIssues', () => {
  it('làm phẳng cây lỗi', () => {
    const errors: ValidationError[] = [
      {
        property: 'profile',
        children: [{ property: 'name', constraints: { isString: 'name must be a string' } }],
      },
    ]
    expect(toValidationIssues(errors)).toEqual([
      { path: 'profile.name', code: 'isString', message: 'name must be a string' },
    ])
  })
})
