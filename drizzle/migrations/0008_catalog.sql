CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('ongoing', 'completed');--> statement-breakpoint
CREATE TABLE "chapter_views" (
	"story_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chapter_views_pkey" PRIMARY KEY("story_id","chapter_number","day"),
	CONSTRAINT "chapter_views_views_check" CHECK ("chapter_views"."views" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	CONSTRAINT "chapters_story_id_number_key" UNIQUE("story_id","number"),
	CONSTRAINT "chapters_number_check" CHECK ("chapters"."number" between 1 and 99999),
	CONSTRAINT "chapters_title_check" CHECK (char_length("chapters"."title") <= 120),
	CONSTRAINT "chapters_content_check" CHECK (char_length("chapters"."content") between 1 and 200000),
	CONSTRAINT "chapters_scheduled_draft" CHECK ("chapters"."scheduled_at" is null or "chapters"."status" = 'draft')
);
--> statement-breakpoint
CREATE TABLE "curated_stories" (
	"list" text NOT NULL,
	"story_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "curated_stories_pkey" PRIMARY KEY("list","story_id"),
	CONSTRAINT "curated_stories_list_check" CHECK ("curated_stories"."list" in ('featured', 'editor_pick'))
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "story_status" DEFAULT 'ongoing' NOT NULL,
	"visibility" "publication_status" DEFAULT 'draft' NOT NULL,
	"cover_path" text,
	"search_title" text GENERATED ALWAYS AS (slugify("stories"."title")) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"taken_down_at" timestamp with time zone,
	"takedown_reason" text,
	"author_name" text,
	"review_status" "review_status",
	"review_submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"cover_thumb_path" text,
	CONSTRAINT "stories_slug_key" UNIQUE("slug"),
	CONSTRAINT "stories_slug_check" CHECK ("stories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length("stories"."slug") <= 140),
	CONSTRAINT "stories_title_check" CHECK (char_length("stories"."title") between 2 and 120),
	CONSTRAINT "stories_description_check" CHECK (char_length("stories"."description") <= 3000),
	CONSTRAINT "stories_cover_path_check" CHECK (char_length("stories"."cover_path") <= 300),
	CONSTRAINT "stories_takedown_reason_check" CHECK (char_length("stories"."takedown_reason") between 1 and 500),
	CONSTRAINT "stories_takedown_consistent" CHECK (("stories"."taken_down_at" is null) = ("stories"."takedown_reason" is null)),
	CONSTRAINT "stories_author_name_check" CHECK ("stories"."author_name" is null or char_length("stories"."author_name") between 1 and 60),
	CONSTRAINT "stories_review_reason_check" CHECK (char_length("stories"."review_reason") between 1 and 500),
	CONSTRAINT "stories_review_reason_rejected" CHECK (case when "stories"."review_status" = 'rejected' then "stories"."review_reason" is not null else "stories"."review_reason" is null end)
);
--> statement-breakpoint
CREATE TABLE "story_genres" (
	"story_id" uuid NOT NULL,
	"genre_slug" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "story_genres_pkey" PRIMARY KEY("story_id","genre_slug")
);
--> statement-breakpoint
CREATE TABLE "story_stats" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"first_chapter_number" integer,
	"latest_chapter_number" integer,
	"latest_chapter_title" text,
	"last_chapter_at" timestamp with time zone,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"rating_counts" integer[] DEFAULT '{0,0,0,0,0}' NOT NULL,
	"rating_count" integer GENERATED ALWAYS AS (rating_counts[1] + rating_counts[2] + rating_counts[3] + rating_counts[4] + rating_counts[5]) STORED,
	"rating_sum" integer GENERATED ALWAYS AS (rating_counts[1] + 2 * rating_counts[2] + 3 * rating_counts[3] + 4 * rating_counts[4] + 5 * rating_counts[5]) STORED,
	"rating_avg" numeric(3, 2) GENERATED ALWAYS AS (case when rating_counts[1] + rating_counts[2] + rating_counts[3] + rating_counts[4] + rating_counts[5] = 0 then 0 else round((rating_counts[1] + 2 * rating_counts[2] + 3 * rating_counts[3] + 4 * rating_counts[4] + 5 * rating_counts[5])::numeric / (rating_counts[1] + rating_counts[2] + rating_counts[3] + rating_counts[4] + rating_counts[5]), 2) end) STORED,
	"next_chapter_number" integer,
	"next_chapter_at" timestamp with time zone,
	"vote_count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "story_stats_rating_counts_check" CHECK (cardinality("story_stats"."rating_counts") = 5)
);
--> statement-breakpoint
ALTER TABLE "genres" DROP CONSTRAINT "genres_created_by_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chapter_views" ADD CONSTRAINT "chapter_views_story_id_chapter_number_fkey" FOREIGN KEY ("story_id","chapter_number") REFERENCES "public"."chapters"("story_id","number") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_stories" ADD CONSTRAINT "curated_stories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_genre_slug_fkey" FOREIGN KEY ("genre_slug") REFERENCES "public"."genres"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "story_stats" ADD CONSTRAINT "story_stats_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapters_scheduled_at_idx" ON "chapters" USING btree ("scheduled_at") WHERE "chapters"."scheduled_at" is not null;--> statement-breakpoint
CREATE INDEX "curated_stories_story_id_idx" ON "curated_stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "stories_owner_id_updated_at_idx" ON "stories" USING btree ("owner_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "stories_search_title_trgm_idx" ON "stories" USING gin ("search_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "story_genres_genre_slug_idx" ON "story_genres" USING btree ("genre_slug");--> statement-breakpoint
CREATE INDEX "story_stats_last_chapter_at_idx" ON "story_stats" USING btree ("last_chapter_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "story_stats_view_count_idx" ON "story_stats" USING btree ("view_count" DESC NULLS FIRST);--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;