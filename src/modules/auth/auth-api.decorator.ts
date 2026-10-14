// Decorator Swagger dùng chung cho các route của auth.
import { ApiBody, ApiHeader, ApiOperation } from '@nestjs/swagger'
import { RefreshTokenDto } from './dto/refresh-token.dto'

const SESSION_DESCRIPTION =
  'Web nhận refresh token trong cookie HttpOnly `refresh_token` (path /v1/auth); mobile gửi header ' +
  '`X-Client: mobile` để nhận trong body. Trên trang này, gọi xong thì access token được tự điền ' +
  'vào nút Authorize.'

/** Route trả phiên đăng nhập (register, login): tóm tắt + cách nhận refresh token */
export const ApiSessionOperation = (summary: string) =>
  ApiOperation({ summary, description: SESSION_DESCRIPTION })

/** Header X-Client (mobile nhận refresh token trong body) */
export const ApiClientHeader = () =>
  ApiHeader({
    name: 'X-Client',
    required: false,
    description: '`mobile`: refresh token trả trong body thay vì cookie',
    schema: { type: 'string', enum: ['mobile'] },
  })

/** Body tùy chọn của /refresh, /logout; Swagger UI có sẵn hai ví dụ để chọn */
export const ApiRefreshTokenBody = () =>
  ApiBody({
    type: RefreshTokenDto,
    required: false,
    examples: {
      web: { summary: 'Web: để trống, dùng cookie refresh_token', value: {} },
      mobile: { summary: 'Mobile: gửi refresh token', value: { refreshToken: '<refreshToken>' } },
    },
  })
