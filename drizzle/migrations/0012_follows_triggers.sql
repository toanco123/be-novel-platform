-- Trigger của theo dõi (chép từ bản mới nhất của Supabase: migration activity,
-- counters_skip_deleted_story). Trạng thái suy ra nên để ở DB: mọi đường ghi (theo dõi, lưu chỗ đọc,
-- gộp lịch sử khách) đều ra cùng kết quả.

-- Mốc "đã thấy" khi theo dõi: chương mới nhất hiện có, hoặc chương đã đọc tới nếu xa hơn
CREATE FUNCTION follows_set_seen_chapter() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.seen_chapter := greatest(
    NEW.seen_chapter,
    coalesce((
      SELECT st.latest_chapter_number FROM public.story_stats st WHERE st.story_id = NEW.story_id
    ), 0),
    coalesce((
      SELECT h.chapter_number FROM public.reading_history h
      WHERE h.user_id = NEW.user_id AND h.story_id = NEW.story_id
    ), 0)
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER follows_set_seen_chapter BEFORE INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION follows_set_seen_chapter();--> statement-breakpoint

-- Số người theo dõi của truyện. Xóa truyện (hoặc tài khoản chủ truyện) thì cascade xóa theo dõi sau
-- khi dòng truyện đã mất: bỏ qua, không thì cập nhật story_stats hỏng cả lệnh xóa.
CREATE FUNCTION follows_count() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  sid uuid := coalesce(NEW.story_id, OLD.story_id);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id = sid) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'INSERT' THEN
    UPDATE public.story_stats SET follower_count = follower_count + 1 WHERE story_id = sid;
  ELSE
    UPDATE public.story_stats SET follower_count = greatest(follower_count - 1, 0)
    WHERE story_id = sid;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER follows_count AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION follows_count();--> statement-breakpoint

-- Đọc tới chương xa hơn mốc "đã thấy" của truyện đang theo dõi thì nâng mốc
CREATE FUNCTION reading_history_bump_seen() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.follows f
  SET seen_chapter = NEW.chapter_number
  WHERE f.user_id = NEW.user_id
    AND f.story_id = NEW.story_id
    AND f.seen_chapter < NEW.chapter_number;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER reading_history_bump_seen AFTER INSERT OR UPDATE ON reading_history
  FOR EACH ROW EXECUTE FUNCTION reading_history_bump_seen();
