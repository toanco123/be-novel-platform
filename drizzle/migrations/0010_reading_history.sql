CREATE TABLE "reading_history" (
	"user_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"chapter_title" text DEFAULT '' NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_history_pkey" PRIMARY KEY("user_id","story_id"),
	CONSTRAINT "reading_history_chapter_number_check" CHECK ("reading_history"."chapter_number" between 1 and 99999),
	CONSTRAINT "reading_history_chapter_title_check" CHECK (char_length("reading_history"."chapter_title") <= 120),
	CONSTRAINT "reading_history_progress_check" CHECK ("reading_history"."progress" between 0 and 1)
);
--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reading_history_user_id_read_at_idx" ON "reading_history" USING btree ("user_id","read_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "reading_history_story_id_idx" ON "reading_history" USING btree ("story_id");