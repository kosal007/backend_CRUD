CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "products_deleted_idx" ON "products" USING btree ("deleted");