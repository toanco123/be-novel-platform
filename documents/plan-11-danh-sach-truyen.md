# Phần 11: Danh sách truyện và truyện chọn tay

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- **Thứ tự khi bằng nhau:** web chỉ phân định bằng `id`. BE thêm một mốc thời gian trước `id`, để danh sách và phần tự chọn của trang chủ dùng chung một kiểu sắp xếp:
  - `views`: lượt đọc bằng nhau thì truyện mới cập nhật trước;
  - `rating`: điểm, lượt chấm bằng nhau thì truyện mới đăng trước.
- Không thêm hàm `top` riêng cho phần tự chọn: dùng lại `list` với `sort` và `limit` (`CURATED_FALLBACK`).

## Mục tiêu

Thay các hàm danh sách của web (`features/stories/api.remote.ts`):

| Web                                              | BE                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `browseStories` (`/list/:type`, `/genres/:slug`) | `GET /v1/stories` có lọc, sắp xếp                                     |
| `getLatestUpdated`, `getNewReleases` (trang chủ) | `GET /v1/stories?sort=updated&pageSize=12`, `?sort=newest&pageSize=6` |
| `getStoriesByAuthor`                             | `GET /v1/stories?author=<author.slug>`                                |
| `getFeaturedStories`, `getEditorPicks`           | `GET /v1/curated-stories?list=featured\|editor_pick`                  |

Danh sách chỉ gồm **truyện công khai có ít nhất một chương đã xuất bản** (`isPublicStory`, như web lọc `story_cards`). Chủ truyện cũng không thấy truyện nháp của mình ở đây.

## API

### `GET /v1/stories` (public)

Query (kế thừa `PageQueryDto`; web dùng `pageSize=24`):

| Tham số  | Giá trị                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `status` | `ongoing` \| `completed`                                                                                                       |
| `genre`  | Slug thể loại (dạng `^[a-z0-9]+(-[a-z0-9]+)*$`, sai dạng → 400)                                                                |
| `length` | Theo số chương đã xuất bản: `short` < 50, `medium` 50–200, `long` > 200 (như web)                                              |
| `author` | `author.slug` của truyện: `tac-gia-<ownerId>` (truyện không bút danh) hoặc `tac-gia-<ownerId>-<slug bút danh>`. Sai dạng → 400 |
| `sort`   | `updated` (mặc định) \| `views` \| `rating` \| `newest`                                                                        |

- **Sắp xếp** (giảm dần, như `sortColumns` của web; cùng giá trị thì theo `id`):

  | `sort`    | Theo                                    |
  | --------- | --------------------------------------- |
  | `updated` | `updatedAt` của thẻ truyện              |
  | `views`   | `viewCount`                             |
  | `rating`  | `ratingAvg`, rồi `ratingCount`          |
  | `newest`  | `createdAt` của thẻ (lần đầu công khai) |

- **Lọc tác giả** như `getStoriesByAuthor` của web: cùng chủ truyện, và cùng bút danh.
  - Có bút danh: so `slugify(author_name)` bằng hàm SQL `slugify`.
  - Không bút danh: chỉ lấy truyện cũng không có bút danh (hoặc bút danh có slug rỗng, khớp `authorSlug`).
  - Trang truyện tự bỏ truyện đang xem ở client.
- **Trả về:** `@ResponsePage(StoryDto)`; mô tả chỉ 300 ký tự đầu.
- **`Cache-Control: public, max-age=60`:** danh sách giống nhau với mọi người.

### `GET /v1/curated-stories?list=featured|editor_pick` (public)

Đặt ở đường dẫn riêng (không phải `/v1/stories/...`), để không đụng slug truyện.

- **Có truyện chọn tay** (bảng `curated_stories`, như `curated_story_cards`):
  - lấy theo `position`;
  - chỉ truyện công khai có chương.
- **Chưa chọn tay** (hoặc mọi truyện đã chọn đều không còn công khai): tự chọn như web.

  | `list`        | Tự chọn                                                   |
  | ------------- | --------------------------------------------------------- |
  | `featured`    | 4 truyện nhiều lượt đọc nhất, rồi mới cập nhật            |
  | `editor_pick` | 8 truyện điểm cao nhất, rồi nhiều lượt chấm, rồi mới đăng |

- **Trả về:** `@ResponseDto(StoryDto, { isArray: true })`, `Cache-Control: public, max-age=60`.
- Quản trị viên chọn truyện (`admin_set_curated`, tối đa 8 / 12) làm ở đợt Quản trị.

## Thiết kế

- **`StoriesRepository`:**
  - `list(filter, window)`, `count(filter)`;
  - `curated(list)`;
  - `top(order, limit)`.
  - Dùng chung `selectCards` (mô tả rút gọn) và `isPublicStory()`.
  - Lọc thể loại bằng `exists` trên `story_genres`.
- **Đọc `author`:** `parseAuthorSlug` (`modules/stories/author-slug.ts`, cạnh `authorSlug`) → `{ ownerId, authorKey }`, sai dạng → null. DTO kiểm tra dạng bằng `@Matches`.
- **Controller mới `CuratedStoriesController`** (`/v1/curated-stories`) trong module `stories`.
  - Module có 2 controller nên gom vào `controllers/`.
  - Service tương ứng: `StoriesService` (danh sách) và `CuratedStoriesService` (chọn tay, tự chọn) gom vào `services/`.
- **Hằng số** (`stories.constants.ts`):
  - số truyện tự chọn: `FEATURED_FALLBACK = 4`, `EDITOR_PICK_FALLBACK = 8`;
  - ngưỡng độ dài: 50 / 200;
  - `STORIES_CACHE_CONTROL`.

## Kiểm tra

Test tạo dữ liệu riêng; vì DB dùng chung giữa các test, lọc theo thể loại hoặc tác giả riêng của test để biết chắc kết quả.

- **e2e:**
  - **Chỉ truyện công khai có chương:** truyện nháp, truyện không có chương xuất bản không có trong danh sách (lọc theo thể loại riêng của test).
  - **Lọc:**
    - `status`;
    - `length` (đặt `chapter_count` trong `story_stats`);
    - `genre`;
    - `author` có / không bút danh (truyện cùng chủ khác bút danh không lẫn).
  - **Sắp xếp:** đủ 4 kiểu, cùng giá trị thì theo `id`.
  - **Phân trang:** `meta` đúng.
  - **Tham số sai** (`sort=hot`, `genre=Ngôn Tình`, `author=abc`) → 400.
  - **Mô tả** ở danh sách tối đa 300 ký tự.
  - **Truyện chọn tay:**
    - đúng thứ tự `position`;
    - bỏ truyện đã ẩn;
    - `list` sai → 400.
  - **Tự chọn khi trống:** DB dùng chung, nên kiểm tra truyện có lượt đọc / điểm vượt trội đứng đầu. Đặt số liệu rất lớn trong `story_stats`, xóa dòng `curated_stories` của list đó trong test.
- **Unit:** `parseAuthorSlug` (đúng, sai uuid, có / không bút danh).
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Danh sách truyện (lọc, sắp xếp, tác giả) và truyện chọn tay cho trang chủ".
