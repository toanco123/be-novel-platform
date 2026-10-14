CREATE TYPE "public"."comment_report_reason" AS ENUM('spam', 'offensive', 'spoiler', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_pkey" PRIMARY KEY("user_id","comment_id")
);
--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "comment_report_reason" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"content_snapshot" text,
	CONSTRAINT "comment_reports_note_check" CHECK (char_length("comment_reports"."note") <= 500),
	CONSTRAINT "comment_reports_check" CHECK ("comment_reports"."reason" <> 'other' or "comment_reports"."note" <> ''),
	CONSTRAINT "comment_reports_content_snapshot_check" CHECK (char_length("comment_reports"."content_snapshot") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_likes_comment_id_idx" ON "comment_likes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_likes_user_id_created_at_idx" ON "comment_likes" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "comment_reports_open_unique" ON "comment_reports" USING btree ("reporter_id","comment_id") WHERE "comment_reports"."status" = 'open';--> statement-breakpoint
CREATE INDEX "comment_reports_comment_id_status_idx" ON "comment_reports" USING btree ("comment_id","status");--> statement-breakpoint
CREATE INDEX "comment_reports_reporter_id_created_at_idx" ON "comment_reports" USING btree ("reporter_id","created_at" DESC NULLS FIRST);