CREATE TABLE "donations" (
	"id" text PRIMARY KEY NOT NULL,
	"razorpay_order_id" text NOT NULL,
	"razorpay_payment_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"donor_name" text,
	"donor_email" text,
	"receipt_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "donations_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id"),
	CONSTRAINT "donations_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "donations_order_idx" ON "donations" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "donations_payment_idx" ON "donations" USING btree ("razorpay_payment_id");