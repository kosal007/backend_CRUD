import {
  bigint,
  boolean,
  doublePrecision,
  index,
  pgTable,
  uniqueIndex,
  text,
  uuid,
  timestamp,
  pgEnum
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const storeStatusEnum = pgEnum("store_status", ["active", "inactive"]);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    radius: doublePrecision("radius").notNull(),
    status: storeStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    storesStatusIdx: index("stores_status_idx").on(table.status),
    storesUpdatedAtIdx: index("stores_updated_at_idx").on(table.updatedAt),
  })
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

export const attendanceStatusEnum = pgEnum("attendance_status", ["active", "completed"]);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict", onUpdate: "cascade" }),
    checkInTime: timestamp("check_in_time").notNull().defaultNow(),
    checkOutTime: timestamp("check_out_time"),
    status: attendanceStatusEnum("status").notNull().default("active"),
    totalDuration: bigint("total_duration", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    attendanceUserIdx: index("attendance_user_idx").on(table.userId),
    attendanceStoreIdx: index("attendance_store_idx").on(table.storeId),
    attendanceStatusIdx: index("attendance_status_idx").on(table.status),
    attendanceCheckInIdx: index("attendance_check_in_idx").on(table.checkInTime),
    attendanceSingleActiveUserIdx: uniqueIndex("attendance_single_active_user_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
  })
);

export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type NewAttendanceSession = typeof attendanceSessions.$inferInsert;

export const deviceTokens = pgTable("device_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id")
               .notNull()
               .references(() => users.id, { onDelete: "cascade" }),
  token:     text("token").notNull().unique(),
  platform:  text("platform"),  // 'ios' or 'android'
  createdAt: timestamp("created_at").defaultNow(),
});
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;