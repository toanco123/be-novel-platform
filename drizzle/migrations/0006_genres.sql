CREATE TABLE "genres" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_check" CHECK ("genres"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "genres_name_check" CHECK (char_length("genres"."name") between 2 and 30),
	CONSTRAINT "genres_description_check" CHECK (char_length("genres"."description") <= 200)
);
--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "genres_created_by_idx" ON "genres" USING btree ("created_by");