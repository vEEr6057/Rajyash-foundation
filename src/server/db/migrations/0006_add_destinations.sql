ALTER TYPE "public"."role" ADD VALUE 'driver' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"city" text DEFAULT 'Ahmedabad' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
