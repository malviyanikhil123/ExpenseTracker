import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../lib/errors.js";
import { financeService } from "../services/finance.service.js";
import { userRepository } from "../repositories/user.repository.js";
import {
  accountSchema, baseTransactionSchema, budgetSchema, categorySchema, idParamsSchema, monthQuerySchema,
  passwordSchema, profileSchema, transactionQuerySchema, transactionSchema,
  debtSchema, repaymentSchema,
} from "../validators/schemas.js";

const userId = (request: FastifyRequest) => request.user.sub;

export const apiController = {
  listAccounts: (request: FastifyRequest) => financeService.listAccounts(userId(request)),
  createAccount: (request: FastifyRequest) =>
    financeService.createAccount({ ...accountSchema.parse(request.body), userId: userId(request), balance: String(accountSchema.parse(request.body).balance) }),
  updateAccount: async (request: FastifyRequest) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = accountSchema.partial().parse(request.body);
    const row = await financeService.updateAccount(userId(request), id, { ...input, balance: input.balance === undefined ? undefined : String(input.balance) });
    if (!row) throw new AppError("Account not found", 404, "NOT_FOUND");
    return row;
  },
  deleteAccount: async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParamsSchema.parse(request.params);
    await financeService.deleteAccount(userId(request), id);
    return reply.status(204).send();
  },
  listCategories: (request: FastifyRequest) => {
    const query = request.query as { type?: "expense" | "income" };
    return financeService.listCategories(userId(request), query.type);
  },
  createCategory: (request: FastifyRequest) =>
    financeService.createCategory({ ...categorySchema.parse(request.body), userId: userId(request) }),
  deleteCategory: async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParamsSchema.parse(request.params);
    await financeService.deleteCategory(userId(request), id);
    return reply.status(204).send();
  },
  listTransactions: (request: FastifyRequest) => financeService.listTransactions(userId(request), transactionQuerySchema.parse(request.query)),
  createTransaction: (request: FastifyRequest) => {
    const input = transactionSchema.parse(request.body);
    return financeService.createTransaction(userId(request), { ...input, userId: userId(request), amount: String(input.amount), note: input.note ?? null });
  },
  updateTransaction: async (request: FastifyRequest) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = baseTransactionSchema.partial().superRefine((value, ctx) => {
      if (value.type === "expense" || value.type === "income") {
        if (!value.accountId || !value.categoryId) {
          ctx.addIssue({ code: "custom", message: "Account and category are required" });
        }
      }
    }).parse(request.body);
    const row = await financeService.updateTransaction(userId(request), id, { ...input, amount: input.amount === undefined ? undefined : String(input.amount), note: input.note === undefined ? undefined : (input.note ?? null) });
    if (!row) throw new AppError("Transaction not found", 404, "NOT_FOUND");
    return row;
  },
  deleteTransaction: async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParamsSchema.parse(request.params);
    await financeService.deleteTransaction(userId(request), id);
    return reply.status(204).send();
  },
  setBudget: (request: FastifyRequest) => {
    const input = budgetSchema.parse(request.body);
    return financeService.upsertBudget({ ...input, userId: userId(request), amount: String(input.amount) });
  },
  budgetStatus: (request: FastifyRequest) => {
    const { month, year } = monthQuerySchema.parse(request.query);
    return financeService.budgetStatus(userId(request), month, year);
  },
  summary: (request: FastifyRequest) => {
    const { month, year } = monthQuerySchema.parse(request.query);
    return financeService.summary(userId(request), month, year);
  },
  monthly: async (request: FastifyRequest) => {
    const { year } = monthQuerySchema.parse(request.query);
    return Promise.all(Array.from({ length: 12 }, (_, index) => financeService.summary(userId(request), index + 1, year).then((data) => ({ month: index + 1, ...data }))));
  },
  categories: (request: FastifyRequest) => {
    const { month, year } = monthQuerySchema.parse(request.query);
    return financeService.categoryAnalytics(userId(request), month, year);
  },
  calendar: (request: FastifyRequest) => {
    const { month, year } = monthQuerySchema.parse(request.query);
    return financeService.calendar(userId(request), month, year);
  },
  me: async (request: FastifyRequest) => {
    const user = await userRepository.findById(userId(request));
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    return { id: user.id, fullName: user.fullName, email: user.email };
  },
  updateProfile: (request: FastifyRequest) => userRepository.updateName(userId(request), profileSchema.parse(request.body).fullName),
  changePassword: async (request: FastifyRequest, reply: FastifyReply) => {
    const input = passwordSchema.parse(request.body);
    const user = await userRepository.findById(userId(request));
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new AppError("Current password is incorrect", 400, "INVALID_PASSWORD");
    await userRepository.updatePassword(user.id, await bcrypt.hash(input.newPassword, 12));
    return reply.status(204).send();
  },
  listDebts: (request: FastifyRequest) => financeService.listDebts(userId(request)),
  createDebt: (request: FastifyRequest) =>
    financeService.createDebt(userId(request), debtSchema.parse(request.body)),
  repayDebt: async (request: FastifyRequest) => {
    const { id } = idParamsSchema.parse(request.params);
    return financeService.repayDebt(userId(request), id, repaymentSchema.parse(request.body));
  },
  deleteDebt: async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParamsSchema.parse(request.params);
    await financeService.deleteDebt(userId(request), id);
    return reply.status(204).send();
  },
  listRepayments: (request: FastifyRequest) => {
    const { id } = idParamsSchema.parse(request.params);
    return financeService.listRepayments(userId(request), id);
  },
  markReminderSent: async (request: FastifyRequest) => {
    const { id } = idParamsSchema.parse(request.params);
    return financeService.markReminderSent(userId(request), id);
  },
};


