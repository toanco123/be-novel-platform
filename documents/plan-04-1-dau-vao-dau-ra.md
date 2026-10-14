# Phần 4.1: Kiểm soát đầu vào, đầu ra

Trạng thái: ✅ xong (14/10/2026). Bổ sung bọc response `{ data, meta }`: ✅ (14/10/2026).

**Khác so với plan:** pipe validate thành class `AppValidationPipe` (kế thừa `ValidationPipe`, đổi khóa trước khi gọi `transform` gốc) thay cho hàm `createValidationPipe`. OpenAPI không đổi schema, chỉ thêm một dòng mô tả về tên trường.

## Mục tiêu

Người dùng hỏi có nên thêm decorator kiểm soát đầu vào, đầu ra không. Đã chốt (14/10/2026):

- **Đầu vào** (body, query): nhận cả **camelCase** lẫn **snake_case** (`displayName` hay `display_name` đều được). Server đổi về camelCase trước khi validate. Gửi cả hai dạng của cùng một trường thì lấy camelCase.
- **Đầu ra:** luôn **camelCase**. Response **chỉ có các trường khai báo trong DTO trả về**: service lỡ trả thừa trường (vd `passwordHash`) cũng không lộ ra ngoài.
- **Trường lạ ở đầu vào:** bỏ qua như hiện tại (không báo lỗi).

## Thiết kế

### Đầu vào

- **`camelCaseKeys(value)`** (`common/utils/case-keys.ts`):
  - Đổi khóa snake_case sang camelCase, đệ quy vào object con và mảng.
  - Khóa không phải snake_case giữ nguyên. Khóa camelCase thắng khi trùng.
  - Bỏ các khóa nguy hiểm (`__proto__`, `constructor`, `prototype`).
- **`ValidationPipe` toàn cục** (`common/validation/validation.pipe.ts`): với `body` và `query`, chạy `camelCaseKeys` trước khi validate. DTO vẫn viết camelCase.
- Lỗi validate báo `path` theo tên camelCase.

### Đầu ra

- **`@ApiField(options)`** (`common/response/api-field.decorator.ts`): dùng cho trường của DTO trả về, thay `@ApiProperty`.
  - Gộp `@Expose()` (trường được phép ra ngoài) với `@ApiProperty(options)` (Swagger).
  - Kiểu là class DTO khác (vd `user: MeDto`, hoặc mảng `[ItemDto]`) thì tự thêm `@Type()` để lọc cả object con.
  - Có thêm `@ApiFieldOptional()`.
- **`@ResponseDto(Dto, { status? })`** (`common/response/response-dto.decorator.ts`), đặt trên route:
  - Lúc chạy: `@SerializeOptions({ type: Dto, excludeExtraneousValues: true })`, chỉ giữ trường có `@ApiField`.
  - Swagger: `@ApiResponse({ status, type: Dto })`, thay `@ApiOkResponse` / `@ApiCreatedResponse`.
- **`ClassSerializerInterceptor` toàn cục** (đăng ký ở `CommonModule`).
- Đổi `MeDto`, `AuthSessionDto`, `ErrorResponseDto` sang `@ApiField`; controller `auth`, `me` dùng `@ResponseDto`.

## Kiểm tra

- **Unit:**
  - `camelCaseKeys`: khóa lồng, mảng, trùng thì camelCase thắng, bỏ `__proto__`, khóa không phải snake_case giữ nguyên.
  - Pipe: `RegisterDto` nhận `display_name`; query cũng được đổi.
- **e2e:**
  - Đăng ký bằng body snake_case (`display_name`); refresh mobile bằng `refresh_token`.
  - Route test trả thừa trường (cả trong object con) → response chỉ có trường khai báo.
  - `/v1/me` trả đúng các khóa của `MeDto`.
- lint, typecheck, format, build, test unit, e2e đều qua; OpenAPI không đổi schema.

## Commit

"Đầu vào nhận camelCase / snake_case, đầu ra lọc theo DTO (@ResponseDto, @ApiField)".

## Bổ sung: bọc response `{ data, meta }` (người dùng chọn, 14/10/2026)

Thay quyết định "không bọc response" của thiết kế tổng thể (mục 3.6).

- **Route có `@ResponseDto(Dto)`** trả `{ data: <DTO đã lọc>, meta: { requestId } }`.
- **Danh sách** (làm cùng phân trang ở phần 7): `{ data: [...], meta: { total, page, pageCount, requestId } }`.
- **Giữ nguyên:**
  - Lỗi vẫn `{ code, message, details?, requestId }`, không bọc.
  - 204 (đăng xuất) body trống.
  - `/health/*` giữ dạng của terminus cho Docker và load balancer.
- **Cách làm:**
  - `ResponseInterceptor` (`common/response/`) thay `ClassSerializerInterceptor`: lọc theo DTO (chỉ trường có `@ApiField`) rồi bọc.
  - `@ResponseDto` ghi metadata và schema Swagger dạng `{ data: $ref Dto, meta: $ref ResponseMetaDto }`.
- **Swagger UI:** script tự điền token đọc `data.accessToken`.
- **Kiểm tra:**
  - e2e đọc `body.data`.
  - Test quét `openapi.json`: mọi route `/v1` trả 200 / 201 phải có schema `{ data, meta }`, để bắt route quên `@ResponseDto`.
