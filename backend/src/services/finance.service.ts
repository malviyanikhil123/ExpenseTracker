import { AppError } from "../lib/errors.js";
import { financeRepository } from "../repositories/finance.repository.js";

export const financeService = {
  ...financeRepository,
  async createTransaction(userId: string, input: Parameters<typeof financeRepository.createTransaction>[0]) {
    const accountIds = [input.accountId, input.fromAccountId, input.toAccountId].filter(Boolean) as string[];
    for (const id of accountIds) {
      if (!(await financeRepository.findAccount(userId, id))) throw new AppError("Account not found", 404, "NOT_FOUND");
    }
    return financeRepository.createTransaction({ ...input, userId });
  },
  async updateTransaction(userId: string, transactionId: string, input: Partial<Parameters<typeof financeRepository.createTransaction>[0]>) {
    const accountIds = [input.accountId, input.fromAccountId, input.toAccountId].filter(Boolean) as string[];
    for (const id of accountIds) {
      if (!(await financeRepository.findAccount(userId, id))) throw new AppError("Account not found", 404, "NOT_FOUND");
    }
    return financeRepository.updateTransaction(userId, transactionId, input);
  },
  async deleteTransaction(userId: string, transactionId: string) {
    return financeRepository.deleteTransaction(userId, transactionId);
  },
  async budgetStatus(userId: string, month: number, year: number) {
    const [budget, summary] = await Promise.all([
      financeRepository.getBudget(userId, month, year),
      financeRepository.summary(userId, month, year),
    ]);
    const amount = Number(budget?.amount ?? 0);
    return { budget: amount, spent: summary.expense, remaining: amount - summary.expense };
  },
  async createDebt(
    userId: string,
    input: {
      personName: string;
      type: "lend" | "borrow";
      amount: number;
      note?: string | null;
      accountId: string;
      transactionDate: Date;
      phoneNumber?: string | null;
      reminderInterval?: "none" | "daily" | "weekly" | "monthly" | null;
      customMessage?: string | null;
    }
  ) {
    if (!(await financeRepository.findAccount(userId, input.accountId))) {
      throw new AppError("Account not found", 404, "NOT_FOUND");
    }
    return financeRepository.createDebt({
      ...input,
      userId,
      amount: String(input.amount),
      remainingAmount: String(input.amount),
      note: input.note ?? null,
      transactionDate: input.transactionDate,
      phoneNumber: input.phoneNumber ?? null,
      reminderInterval: input.reminderInterval ?? "none",
      customMessage: input.customMessage ?? null,
    });
  },
  async markReminderSent(userId: string, id: string) {
    const debt = await financeRepository.findDebt(userId, id);
    if (!debt) throw new AppError("Debt not found", 404, "NOT_FOUND");
    return financeRepository.markReminderSent(userId, id);
  },
  async repayDebt(userId: string, debtId: string, input: { amount: number; note?: string | null; accountId: string; transactionDate: Date }) {
    const debt = await financeRepository.findDebt(userId, debtId);
    if (!debt) throw new AppError("Debt not found", 404, "NOT_FOUND");
    if (!(await financeRepository.findAccount(userId, input.accountId))) {
      throw new AppError("Account not found", 404, "NOT_FOUND");
    }
    return financeRepository.repayDebt(userId, debtId, {
      ...input,
      userId,
      debtId,
      amount: String(input.amount),
      note: input.note ?? null,
      transactionDate: input.transactionDate,
    });
  },
  async deleteDebt(userId: string, id: string) {
    const debt = await financeRepository.findDebt(userId, id);
    if (!debt) throw new AppError("Debt not found", 404, "NOT_FOUND");
    return financeRepository.deleteDebt(userId, id);
  },
};


