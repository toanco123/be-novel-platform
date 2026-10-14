-- Migration đầu: extension và hàm dùng chung cho các bảng sau.
-- citext: email không phân biệt hoa thường (users.email, phần 4).
-- pgcrypto: gen_random_uuid() và hàm băm khi cần trong SQL.
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint

-- Trigger ghi updated_at khi sửa dòng. Bảng có cột updated_at thêm trong migration của mình:
--   CREATE TRIGGER <bang>_set_updated_at BEFORE UPDATE ON <bang>
--     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
