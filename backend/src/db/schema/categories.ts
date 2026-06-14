import {
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const categoryTypeEnum = pgEnum("category_type", ["expense", "income"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    icon: varchar("icon", { length: 80 }).notNull().default("shape"),
    color: varchar("color", { length: 20 }).notNull().default("#7C5CFC"),
    type: categoryTypeEnum("type").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("categories_user_type_idx").on(table.userId, table.type),
    uniqueIndex("categories_user_name_type_unique").on(table.userId, table.name, table.type),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
