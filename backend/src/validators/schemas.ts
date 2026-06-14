import { z } from "zod";

const money = z.coerce.number().positive().max(999999999999);
const uuid = z.string().uuid();

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  balance: z.coerce.number().min(-999999999999).max(999999999999).default(0),
  icon: z.string().trim().min(1).max(80).default("wallet"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(80).default("shape"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7C5CFC"),
  type: z.enum(["expense", "income"]),
});

export const baseTransactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: money,
  title: z.string().trim().min(1).max(140),
  note: z.string().trim().max(1000).nullish(),
  transactionDate: z.coerce.date(),
  accountId: uuid.nullish(),
  categoryId: uuid.nullish(),
  fromAccountId: uuid.nullish(),
  toAccountId: uuid.nullish(),
});

export const transactionSchema = baseTransactionSchema.superRefine((value, ctx) => {
  if (!value.accountId || !value.categoryId) {
    ctx.addIssue({ code: "custom", message: "Account and category are required" });
  }
});


export const budgetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
  amount: money,
});

export const profileSchema = z.object({ fullName: z.string().trim().min(2).max(100) });
export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export const idParamsSchema = z.object({ id: uuid });
export const monthQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
  year: z.coerce.number().int().min(2000).max(2200).default(() => new Date().getFullYear()),
});
export const transactionQuerySchema = monthQuerySchema.extend({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  type: z.enum(["expense", "income", "transfer"]).optional(),
  search: z.string().trim().max(100).optional(),
  accountId: uuid.optional(),
});

export const debtSchema = z.object({
  personName: z.string().trim().min(1).max(140),
  type: z.enum(["lend", "borrow"]),
  amount: money,
  note: z.string().trim().max(1000).nullish(),
  accountId: uuid,
  transactionDate: z.coerce.date(),
  phoneNumber: z.string().trim().max(30).nullish(),
  reminderInterval: z.enum(["none", "daily", "weekly", "monthly"]).default("none").nullish(),
  customMessage: z.string().trim().nullish(),
});

export const repaymentSchema = z.object({
  amount: money,
  note: z.string().trim().max(1000).nullish(),
  accountId: uuid,
  transactionDate: z.coerce.date(),
});


