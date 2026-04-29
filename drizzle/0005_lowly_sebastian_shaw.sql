CREATE TYPE "public"."attendance_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_out_time" timestamp,
	"status" "attendance_status" DEFAULT 'active' NOT NULL,
	"total_duration" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius" double precision NOT NULL,
	"status" "store_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "attendance_user_idx" ON "attendance_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attendance_store_idx" ON "attendance_sessions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_check_in_idx" ON "attendance_sessions" USING btree ("check_in_time");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_single_active_user_idx" ON "attendance_sessions" USING btree ("user_id") WHERE "attendance_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "stores_status_idx" ON "stores" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stores_updated_at_idx" ON "stores" USING btree ("updated_at");