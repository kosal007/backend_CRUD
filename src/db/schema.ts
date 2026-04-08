import {
  bigint,
  boolean,
  doublePrecision,
  index,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    price: doublePrecision("price").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
  },
  (table) => ({
    productsUpdatedAtIdx: index("products_updated_at_idx").on(table.updatedAt),
    productsDeletedIdx: index("products_deleted_idx").on(table.deleted),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
