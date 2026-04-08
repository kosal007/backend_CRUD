ALTER TABLE "products" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "products" SET "name" = "product_name" WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "product_name";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "synced";