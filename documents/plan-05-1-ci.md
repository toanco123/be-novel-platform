# Phần 5.1: CI (GitHub Actions)

Trạng thái: ✅ xong (14/10/2026).

## Mục tiêu

Người dùng yêu cầu thêm CI sau phần 5 (kéo phần CI của phần 8 lên trước). Mỗi lần push lên `main` và mỗi pull request đều tự kiểm tra:

- Code sạch: lint, format, typecheck, build.
- Test unit và test e2e (Postgres, Redis, Mailpit thật qua Testcontainers; máy `ubuntu-latest` của GitHub có sẵn Docker).
- **Không lệch:**
  - sửa schema Drizzle mà quên sinh migration thì CI báo;
  - đổi API mà quên chạy `npm run openapi:export` thì CI báo.

## Thiết kế

- **File:** `.github/workflows/ci.yml`, chạy khi push `main` và khi có pull request.
- **Chống chạy trùng:** một nhánh chỉ chạy lượt mới nhất (`concurrency`, hủy lượt cũ).
- **Quyền:** chỉ đọc (`permissions: contents: read`).
- **Node** theo `.nvmrc`, cache npm, cài bằng `npm ci`.
- **Hai job chạy song song:**

  | Job     | Việc                                                                                                                                                                                           |
  | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `check` | `lint`, `format:check`, `typecheck`, `build`, `npm test` (unit). Sau đó `drizzle-kit generate`: sinh ra file mới tức là schema đổi mà chưa có migration → lỗi, nhắc chạy `npm run db:generate` |
  | `e2e`   | `npm run test:e2e`                                                                                                                                                                             |

- **`openapi.json` khớp code:** viết thành test e2e `test/openapi.e2e-spec.ts`, để chạy được cả ở máy và trên CI.
  - Dựng app thật, so tài liệu OpenAPI với file `openapi.json` trong repo. Bỏ qua `info.version`, vì version đổi mỗi commit.
  - Lệch thì báo chạy `npm run openapi:export`.
- **Sửa `drizzle.config.ts`:** chỉ đọc `.env` khi file có. CI không có `.env`, nên gọi `process.loadEnvFile()` sẽ lỗi.
- **README:** thêm badge trạng thái CI.

Docker build vẫn để ở phần 8 (chưa có Dockerfile).

## Kiểm tra

- Chạy `npm run test:e2e` ở máy: test `openapi.json` qua. Sửa thử một mô tả API mà không export thì test báo lỗi.
- Sửa thử schema mà không sinh migration: `drizzle-kit generate` sinh file mới (bước CI sẽ báo).
- Push lên GitHub: workflow chạy xanh cả hai job (xem bằng `gh run watch`).

## Commit

"CI: GitHub Actions chạy lint, typecheck, build, test unit, e2e; kiểm tra migration và openapi.json".
