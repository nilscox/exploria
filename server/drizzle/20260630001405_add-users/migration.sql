CREATE TABLE "users" (
	"id" varchar(8) PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255),
	"login_token" varchar(64) NOT NULL UNIQUE,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "owner_id" varchar(8);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");

UPDATE domain_events SET payload = payload || '{ "ownerId": null }' WHERE TYPE = 'SessionCreated'
