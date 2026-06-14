import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { accounts } from "./accounts.js";

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    personName: varchar("person_name", { length: 140 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // "lend" | "borrow"
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    remainingAmount: numeric("remaining_amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
    status: varchar("status", { length: 20 }).notNull().default("open"), // "open" | "repaid"
    phoneNumber: varchar("phone_number", { length: 30 }),
    reminderInterval: varchar("reminder_interval", { length: 20 }).notNull().default("none"), // "none" | "daily" | "weekly" | "monthly"
    customMessage: text("custom_message"),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("debts_user_idx").on(table.userId),
    index("debts_status_idx").on(table.status),
  ],
);

export const debtRepayments = pgTable(
  "debt_repayments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("repayments_debt_idx").on(table.debtId),
    index("repayments_user_idx").on(table.userId),
  ],
);

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type DebtRepayment = typeof debtRepayments.$inferSelect;
export type NewDebtRepayment = typeof debtRepayments.$inferInsert;
