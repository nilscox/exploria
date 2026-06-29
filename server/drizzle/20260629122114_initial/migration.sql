CREATE TABLE "domain_events" (
	"position" serial,
	"id" varchar(8) PRIMARY KEY,
	"aggregate_type" varchar(32) NOT NULL,
	"aggregate_id" varchar(8) NOT NULL,
	"occurred_at" timestamp(6) NOT NULL,
	"type" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(8) PRIMARY KEY,
	"model" varchar(64) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"created_at" timestamp(6) DEFAULT now() NOT NULL
);
