CREATE TYPE "public"."food_category" AS ENUM('cooked_meal', 'raw_produce', 'packaged', 'bakery', 'other');--> statement-breakpoint
CREATE TYPE "public"."pickup_status" AS ENUM('requested', 'accepted', 'en_route', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quantity_unit" AS ENUM('servings', 'kg');--> statement-breakpoint
CREATE TABLE "pickups" (
	"id" text PRIMARY KEY NOT NULL,
	"donor_id" text NOT NULL,
	"volunteer_id" text,
	"category" "food_category" NOT NULL,
	"description" text,
	"quantity" integer NOT NULL,
	"quantity_unit" "quantity_unit" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"address" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"safety_attested" boolean DEFAULT false NOT NULL,
	"food_photo_path" text,
	"proof_photo_path" text,
	"status" "pickup_status" DEFAULT 'requested' NOT NULL,
	"claimed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" text PRIMARY KEY NOT NULL,
	"pickup_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" "pickup_status",
	"to_status" "pickup_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_donor_id_profiles_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_volunteer_id_profiles_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_pickup_id_pickups_id_fk" FOREIGN KEY ("pickup_id") REFERENCES "public"."pickups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pickups_status_idx" ON "pickups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pickups_donor_idx" ON "pickups" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX "pickups_volunteer_idx" ON "pickups" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX "status_events_pickup_idx" ON "status_events" USING btree ("pickup_id");