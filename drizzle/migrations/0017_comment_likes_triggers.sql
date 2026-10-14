-- Trigger đếm lượt thích (chép từ Supabase: migration comment_likes_and_edits). Số liệu suy ra nên để
-- ở DB. Luật của trigger comment_likes_guard (không tự thích, hạn mức) viết trong service.

-- comments.like_count ±1. Bình luận bị xóa (cascade) thì không còn dòng để cập nhật.
CREATE FUNCTION comment_likes_count() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments c SET like_count = c.like_count + 1 WHERE c.id = NEW.comment_id;
  ELSE
    UPDATE public.comments c SET like_count = greatest(c.like_count - 1, 0)
    WHERE c.id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER comment_likes_count AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION comment_likes_count();
