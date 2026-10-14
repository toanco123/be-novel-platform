CREATE TYPE "public"."contact_topic" AS ENUM('general', 'bug', 'copyright', 'partnership');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('typo', 'missing', 'order', 'violation', 'other');--> statement-breakpoint
CREATE TABLE "chapter_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "chapter_reports_note_check" CHECK (char_length("chapter_reports"."note") <= 500),
	CONSTRAINT "chapter_reports_check" CHECK ("chapter_reports"."reason" <> 'other' or "chapter_reports"."note" <> '')
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contact_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" "contact_topic" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"handled_at" timestamp with time zone,
	CONSTRAINT "contact_messages_name_check" CHECK (char_length("contact_messages"."name") between 2 and 60),
	CONSTRAINT "contact_messages_email_check" CHECK (char_length("contact_messages"."email") <= 254 and "contact_messages"."email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
	CONSTRAINT "contact_messages_message_check" CHECK (char_length("contact_messages"."message") between 10 and 2000)
);
--> statement-breakpoint
ALTER TABLE "chapter_reports" ADD CONSTRAINT "chapter_reports_story_id_chapter_number_fkey" FOREIGN KEY ("story_id","chapter_number") REFERENCES "public"."chapters"("story_id","number") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chapter_reports" ADD CONSTRAINT "chapter_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_reports_open_unique" ON "chapter_reports" USING btree ("reporter_id","story_id","chapter_number","reason") WHERE "chapter_reports"."status" = 'open';--> statement-breakpoint
CREATE INDEX "chapter_reports_story_status_created_idx" ON "chapter_reports" USING btree ("story_id","status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "chapter_reports_reporter_id_idx" ON "chapter_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "chapter_reports_story_chapter_idx" ON "chapter_reports" USING btree ("story_id","chapter_number");--> statement-breakpoint
CREATE INDEX "contact_messages_user_id_idx" ON "contact_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_messages_email_created_at_idx" ON "contact_messages" USING btree ("email","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "contact_messages_ip_hash_created_at_idx" ON "contact_messages" USING btree ("ip_hash","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "contact_messages_unhandled_created_at_idx" ON "contact_messages" USING btree ("created_at" DESC NULLS FIRST) WHERE "contact_messages"."handled_at" is null;