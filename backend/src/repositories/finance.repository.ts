import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, budgets, categories, transactions, debts, debtRepayments } from "../db/schema/index.js";

function monthRange(month: number, year: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export const financeRepository = {
  listAccounts: (userId: string) =>
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
  findAccount: (userId: string, id: string) =>
    db.query.accounts.findFirst({ where: and(eq(accounts.id, id), eq(accounts.userId, userId)) }),
  async createAccount(data: typeof accounts.$inferInsert) {
    const [row] = await db.insert(accounts).values(data).returning();
    return row;
  },
  async updateAccount(userId: string, id: string, data: Partial<typeof accounts.$inferInsert>) {
    const [row] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return row;
  },
  deleteAccount: (userId: string, id: string) =>
    db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId))),

  listCategories: (userId: string, type?: "expense" | "income") =>
    db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), type ? eq(categories.type, type) : undefined))
      .orderBy(desc(categories.createdAt)),
  async createCategory(data: typeof categories.$inferInsert) {
    const [row] = await db.insert(categories).values(data).returning();
    return row;
  },
  deleteCategory: (userId: string, id: string) =>
    db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId), eq(categories.isDefault, false))),

  async listTransactions(
    userId: string,
    query: {
      month: number;
      year: number;
      page: number;
      limit: number;
      type?: "expense" | "income" | "transfer";
      search?: string;
      accountId?: string;
    },
  ) {
    const { start, end } = monthRange(query.month, query.year);
    const where = and(
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, start),
      lt(transactions.transactionDate, end),
      query.type ? eq(transactions.type, query.type) : undefined,
      query.search
        ? or(ilike(transactions.title, `%${query.search}%`), ilike(transactions.note, `%${query.search}%`))
        : undefined,
      query.accountId
        ? or(
          eq(transactions.accountId, query.accountId),
          eq(transactions.fromAccountId, query.accountId),
          eq(transactions.toAccountId, query.accountId),
        )
        : undefined,
    );
    const [items, count] = await Promise.all([
      db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          accountId: transactions.accountId,
          categoryId: transactions.categoryId,
          fromAccountId: transactions.fromAccountId,
          toAccountId: transactions.toAccountId,
          type: transactions.type,
          amount: transactions.amount,
          title: transactions.title,
          note: transactions.note,
          transactionDate: transactions.transactionDate,
          category: {
            icon: categories.icon,
            color: categories.color,
            name: categories.name,
          },
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(where)
        .orderBy(desc(transactions.transactionDate))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where),
    ]);
    return { items, total: count[0]?.count ?? 0 };
  },
  findTransaction: (userId: string, id: string) =>
    db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    }),
  createTransaction: (data: typeof transactions.$inferInsert) =>
    db.transaction(async (tx) => {
      const [row] = await tx.insert(transactions).values(data).returning();
      const amount = Number(data.amount);
      if (data.type === "income" && data.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, data.userId)));
      } else if (data.type === "expense" && data.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, data.userId)));
      } else if (data.type === "transfer" && data.fromAccountId && data.toAccountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.fromAccountId), eq(accounts.userId, data.userId)));
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.toAccountId), eq(accounts.userId, data.userId)));
      }
      return row;
    }),
  async updateTransaction(userId: string, id: string, data: Partial<typeof transactions.$inferInsert>) {
    return db.transaction(async (tx) => {
      const old = await tx.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      });
      if (!old) return null;

      // 1. Revert old transaction's impact on balances
      const oldAmount = Number(old.amount);
      if (old.type === "income" && old.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${oldAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.accountId), eq(accounts.userId, userId)));
      } else if (old.type === "expense" && old.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${oldAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.accountId), eq(accounts.userId, userId)));
      } else if (old.type === "transfer" && old.fromAccountId && old.toAccountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${oldAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.fromAccountId), eq(accounts.userId, userId)));
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${oldAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.toAccountId), eq(accounts.userId, userId)));
      }

      // 2. Prepare updated data (handling type conversions cleanly by setting unused columns to null)
      const updateData = { ...data };
      if (updateData.type) {
        if (updateData.type === "transfer") {
          updateData.accountId = null;
          updateData.categoryId = null;
        } else {
          updateData.fromAccountId = null;
          updateData.toAccountId = null;
        }
      }

      // 3. Update the transaction row
      const [row] = await tx
        .update(transactions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      if (!row) return null;

      // 4. Apply new transaction's impact on balances
      const newAmount = Number(row.amount);
      if (row.type === "income" && row.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, row.accountId), eq(accounts.userId, userId)));
      } else if (row.type === "expense" && row.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, row.accountId), eq(accounts.userId, userId)));
      } else if (row.type === "transfer" && row.fromAccountId && row.toAccountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, row.fromAccountId), eq(accounts.userId, userId)));
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, row.toAccountId), eq(accounts.userId, userId)));
      }

      return row;
    });
  },
  deleteTransaction: (userId: string, id: string) =>
    db.transaction(async (tx) => {
      const old = await tx.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      });
      if (!old) return;

      const amount = Number(old.amount);
      if (old.type === "income" && old.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.accountId), eq(accounts.userId, userId)));
      } else if (old.type === "expense" && old.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.accountId), eq(accounts.userId, userId)));
      } else if (old.type === "transfer" && old.fromAccountId && old.toAccountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.fromAccountId), eq(accounts.userId, userId)));
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, old.toAccountId), eq(accounts.userId, userId)));
      }

      await tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }),


  async upsertBudget(data: typeof budgets.$inferInsert) {
    const [row] = await db
      .insert(budgets)
      .values(data)
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month, budgets.year],
        set: { amount: data.amount, updatedAt: new Date() },
      })
      .returning();
    return row;
  },
  getBudget: (userId: string, month: number, year: number) =>
    db.query.budgets.findFirst({
      where: and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
    }),

  async summary(userId: string, month: number, year: number) {
    const { start, end } = monthRange(month, year);
    const rows = await db
      .select({
        type: transactions.type,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, start),
          lt(transactions.transactionDate, end),
        ),
      )
      .groupBy(transactions.type);
    const income = Number(rows.find((row) => row.type === "income")?.total ?? 0);
    const expense = Number(rows.find((row) => row.type === "expense")?.total ?? 0);
    return { income, expense, balance: income - expense };
  },
  async categoryAnalytics(userId: string, month: number, year: number) {
    const { start, end } = monthRange(month, year);
    return db
      .select({
        categoryId: categories.id,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, start),
          lt(transactions.transactionDate, end),
        ),
      )
      .groupBy(categories.id)
      .orderBy(desc(sql`sum(${transactions.amount})`));
  },
  async calendar(userId: string, month: number, year: number) {
    const { start, end } = monthRange(month, year);
    return db
      .select({
        date: sql<string>`to_char(${transactions.transactionDate} at time zone 'UTC', 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, start),
          lt(transactions.transactionDate, end),
        ),
      )
      .groupBy(sql`to_char(${transactions.transactionDate} at time zone 'UTC', 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${transactions.transactionDate} at time zone 'UTC', 'YYYY-MM-DD')`);
  },

  async listDebts(userId: string) {
    return db
      .select({
        id: debts.id,
        userId: debts.userId,
        accountId: debts.accountId,
        personName: debts.personName,
        type: debts.type,
        amount: debts.amount,
        remainingAmount: debts.remainingAmount,
        note: debts.note,
        status: debts.status,
        phoneNumber: debts.phoneNumber,
        reminderInterval: debts.reminderInterval,
        customMessage: debts.customMessage,
        lastReminderSentAt: debts.lastReminderSentAt,
        transactionDate: debts.transactionDate,
        accountName: accounts.name,
      })
      .from(debts)
      .leftJoin(accounts, eq(debts.accountId, accounts.id))
      .where(eq(debts.userId, userId))
      .orderBy(desc(debts.transactionDate));
  },

  async markReminderSent(userId: string, id: string) {
    const [row] = await db
      .update(debts)
      .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .returning();
    return row;
  },

  findDebt(userId: string, id: string) {
    return db.query.debts.findFirst({
      where: and(eq(debts.id, id), eq(debts.userId, userId)),
    });
  },

  createDebt(data: typeof debts.$inferInsert) {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(debts).values(data).returning();
      const amount = Number(data.amount);
      if (data.type === "lend" && data.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, data.userId)));
      } else if (data.type === "borrow" && data.accountId) {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, data.userId)));
      }
      return row;
    });
  },

  async repayDebt(userId: string, debtId: string, data: typeof debtRepayments.$inferInsert) {
    return db.transaction(async (tx) => {
      const debt = await tx.query.debts.findFirst({
        where: and(eq(debts.id, debtId), eq(debts.userId, userId)),
      });
      if (!debt) return null;

      const [repayment] = await tx.insert(debtRepayments).values(data).returning();
      const repayAmount = Number(data.amount);

      const newRemaining = Math.max(0, Number(debt.remainingAmount) - repayAmount);
      const status = newRemaining <= 0 ? "repaid" : "open";

      await tx
        .update(debts)
        .set({ remainingAmount: String(newRemaining), status, updatedAt: new Date() })
        .where(eq(debts.id, debtId));

      if (debt.type === "lend") {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${repayAmount}`, updatedAt: new Date() })
          .where(eq(accounts.id, data.accountId));
      } else if (debt.type === "borrow") {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${repayAmount}`, updatedAt: new Date() })
          .where(eq(accounts.id, data.accountId));
      }

      return repayment;
    });
  },

  async deleteDebt(userId: string, id: string) {
    return db.transaction(async (tx) => {
      const debt = await tx.query.debts.findFirst({
        where: and(eq(debts.id, id), eq(debts.userId, userId)),
      });
      if (!debt) return;

      const startAmount = Number(debt.amount);
      if (debt.type === "lend") {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${startAmount}`, updatedAt: new Date() })
          .where(eq(accounts.id, debt.accountId));
      } else if (debt.type === "borrow") {
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${startAmount}`, updatedAt: new Date() })
          .where(eq(accounts.id, debt.accountId));
      }

      const repayments = await tx.query.debtRepayments.findMany({
        where: and(eq(debtRepayments.debtId, id), eq(debtRepayments.userId, userId)),
      });

      for (const r of repayments) {
        const repayAmt = Number(r.amount);
        if (debt.type === "lend") {
          await tx
            .update(accounts)
            .set({ balance: sql`${accounts.balance} - ${repayAmt}`, updatedAt: new Date() })
            .where(eq(accounts.id, r.accountId));
        } else if (debt.type === "borrow") {
          await tx
            .update(accounts)
            .set({ balance: sql`${accounts.balance} + ${repayAmt}`, updatedAt: new Date() })
            .where(eq(accounts.id, r.accountId));
        }
      }

      await tx.delete(debtRepayments).where(eq(debtRepayments.debtId, id));
      await tx.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
    });
  },

  async listRepayments(userId: string, debtId: string) {
    return db
      .select({
        id: debtRepayments.id,
        userId: debtRepayments.userId,
        debtId: debtRepayments.debtId,
        accountId: debtRepayments.accountId,
        amount: debtRepayments.amount,
        note: debtRepayments.note,
        transactionDate: debtRepayments.transactionDate,
        accountName: accounts.name,
      })
      .from(debtRepayments)
      .leftJoin(accounts, eq(debtRepayments.accountId, accounts.id))
      .where(and(eq(debtRepayments.debtId, debtId), eq(debtRepayments.userId, userId)))
      .orderBy(desc(debtRepayments.transactionDate));
  },
};
