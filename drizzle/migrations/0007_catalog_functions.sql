-- Extension và hàm SQL cho các bảng truyện (phải có trước bảng: cột sinh stories.search_title gọi
-- slugify). Chép từ migration init_extensions_profiles của Supabase; Supabase cài extension ở schema
-- extensions, BE cài ở public.
-- unaccent: bỏ dấu tiếng Việt trong slugify. pg_trgm: index trigram cho tìm kiếm theo tên truyện.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- "Ngôn Tình Đô Thị!" → "ngon-tinh-do-thi", cùng kết quả với slugify của TypeScript
-- (src/common/utils/slugify.ts) và src/lib/slugify.ts của web. unaccent chỉ là STABLE nên phải chỉ
-- rõ từ điển để khai báo IMMUTABLE (dùng được trong cột sinh).
CREATE OR REPLACE FUNCTION slugify(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(
      'public.unaccent'::regdictionary,
      replace(replace(value, 'đ', 'd'), 'Đ', 'D')
    )),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;
