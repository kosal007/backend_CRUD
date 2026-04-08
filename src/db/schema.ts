import {
  bigint,
  boolean,
  doublePrecision,
  index,
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum
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


// 1. Define role enum
export const roleEnum = pgEnum("role", ["ROLE_A", "ROLE_B"]);

// 2. Users table with role
export const users = pgTable("users", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  password:  text("password").notNull(),       // store hashed
  role:      roleEnum("role").notNull().default("ROLE_B"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;