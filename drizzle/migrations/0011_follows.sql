CREATE TABLE "follows" (
	"user_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_chapter" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "follows_pkey" PRIMARY KEY("user_id","story_id"),
	CONSTRAINT "follows_seen_chapter_check" CHECK ("follows"."seen_chapter" >= 0)
);
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_story_id_idx" ON "follows" USING btree ("story_id");