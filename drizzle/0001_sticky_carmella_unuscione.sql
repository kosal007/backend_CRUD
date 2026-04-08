ALTER TABLE "products" ADD COLUMN "product_name" text;--> statement-breakpoint
UPDATE "products" SET "product_name" = "name" WHERE "product_name" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "product_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quantity" double precision DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "synced" boolean;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "name";