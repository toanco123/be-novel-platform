-- Trigger tính số liệu của truyện (chép từ bản mới nhất của Supabase: migration catalog,
-- counters_skip_deleted_story, chapter_scheduling). Đây là số liệu suy ra, không phải luật nghiệp vụ,
-- nên để ở DB: mọi đường ghi chương (Sáng tác, nhập hàng loạt, job xuất bản chương hẹn giờ) đều ra
-- story_stats đúng. Luật nghiệp vụ trong trigger của Supabase viết trong service ở đợt Sáng tác.

-- Ghi updated_at khi sửa (hàm set_updated_at() ở migration 0000_init)
CREATE TRIGGER stories_set_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER chapters_set_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- Mỗi truyện có đúng một dòng story_stats, tạo cùng truyện
CREATE FUNCTION stories_create_stats() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.story_stats (story_id) VALUES (NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER stories_create_stats AFTER INSERT ON stories
  FOR EACH ROW EXECUTE FUNCTION stories_create_stats();--> statement-breakpoint

-- Tính lại các cột về chương của story_stats (chỉ chương đã xuất bản), chương hẹn giờ sớm nhất, và
-- đánh dấu truyện vừa được sửa. Xóa truyện (hoặc tài khoản) thì cascade xóa chương sau khi dòng
-- truyện đã mất: bỏ qua, không thì cập nhật story_stats hỏng cả lệnh xóa.
CREATE FUNCTION chapters_after_change() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  sid uuid := coalesce(NEW.story_id, OLD.story_id);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id = sid) THEN
    RETURN NULL;
  END IF;

  UPDATE public.story_stats st
  SET
    chapter_count = agg.chapter_count,
    first_chapter_number = agg.first_number,
    latest_chapter_number = agg.latest_number,
    latest_chapter_title = agg.latest_title,
    last_chapter_at = agg.last_at
  FROM (
    SELECT
      count(*)::integer AS chapter_count,
      min(c.number) AS first_number,
      max(c.number) AS latest_number,
      (array_agg(c.title ORDER BY c.number DESC))[1] AS latest_title,
      max(c.published_at) AS last_at
    FROM public.chapters c
    WHERE c.story_id = sid AND c.status = 'published'
  ) agg
  WHERE st.story_id = sid;

  -- Không còn chương hẹn giờ thì hai cột về null
  UPDATE public.story_stats st
  SET (next_chapter_number, next_chapter_at) = (
    SELECT c.number, c.scheduled_at
    FROM public.chapters c
    WHERE c.story_id = sid AND c.status = 'draft' AND c.scheduled_at IS NOT NULL
    ORDER BY c.scheduled_at, c.number
    LIMIT 1
  )
  WHERE st.story_id = sid;

  UPDATE public.stories SET updated_at = now() WHERE id = sid;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER chapters_after_change AFTER INSERT OR UPDATE OR DELETE ON chapters
  FOR EACH ROW EXECUTE FUNCTION chapters_after_change();--> statement-breakpoint

-- Đếm lượt đọc theo ngày của nhiều truyện (xếp hạng theo kỳ). Drizzle chưa viết được include nên
-- index này không có trong schema (chapter-views.ts).
CREATE INDEX chapter_views_day_story_idx ON chapter_views (day, story_id) INCLUDE (views);
