ALTER TABLE "users" DROP CONSTRAINT "users_email_key";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;