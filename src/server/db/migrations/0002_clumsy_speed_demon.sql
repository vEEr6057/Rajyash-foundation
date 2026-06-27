CREATE TABLE "location_pings" (
	"id" text PRIMARY KEY NOT NULL,
	"pickup_id" text NOT NULL,
	"volunteer_id" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_pickup_id_pickups_id_fk" FOREIGN KEY ("pickup_id") REFERENCES "public"."pickups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_volunteer_id_profiles_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_pings_pickup_idx" ON "location_pings" USING btree ("pickup_id");--> statement-breakpoint
CREATE INDEX "location_pings_pickup_created_idx" ON "location_pings" USING btree ("pickup_id","created_at" DESC NULLS LAST);