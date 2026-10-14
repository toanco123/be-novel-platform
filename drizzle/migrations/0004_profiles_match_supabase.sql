ALTER TABLE "profiles" DROP CONSTRAINT "profiles_display_name_length";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_display_name_check" CHECK (char_length("profiles"."display_name") between 1 and 30);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_url_check" CHECK (char_length("profiles"."avatar_url") <= 2048);