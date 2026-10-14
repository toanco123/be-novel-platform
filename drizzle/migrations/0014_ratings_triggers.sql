-- Trigger của chấm điểm (chép từ bản mới nhất của Supabase: migration activity,
-- counters_skip_deleted_story). Phân bố sao là số liệu suy ra nên để ở DB.

-- Ghi updated_at khi sửa (hàm set_updated_at() ở migration 0000_init)
CREATE TRIGGER ratings_set_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- Phân bố sao của truyện: bớt điểm cũ, thêm điểm mới. Xóa truyện (hoặc tài khoản chủ truyện) thì
-- cascade xóa điểm sau khi dòng truyện đã mất: bỏ qua, không thì hỏng cả lệnh xóa.
CREATE FUNCTION ratings_count() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE')
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = OLD.story_id) THEN
    UPDATE public.story_stats
    SET rating_counts[OLD.score] = greatest(rating_counts[OLD.score] - 1, 0)
    WHERE story_id = OLD.story_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE')
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = NEW.story_id) THEN
    UPDATE public.story_stats
    SET rating_counts[NEW.score] = rating_counts[NEW.score] + 1
    WHERE story_id = NEW.story_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER ratings_count AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION ratings_count();
