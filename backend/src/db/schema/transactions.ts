import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts.js";
import { categories } from "./categories.js";
import { users } from "./users.js";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
    fromAccountId: uuid("from_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    title: varchar("title", { length: 140 }).notNull(),
    note: text("note"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.transactionDate),
    index("transactions_user_type_idx").on(table.userId, table.type),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
