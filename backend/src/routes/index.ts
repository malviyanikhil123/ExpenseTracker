import type { FastifyInstance } from "fastify";

import { apiController } from "../controllers/api.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { loginSchema, refreshSchema, registerSchema } from "../validators/schemas.js";

export async function routes(app: FastifyInstance) {
  const auth = authService(app);
  app.get("/health", async () => ({ status: "ok" }));
  app.post("/auth/register", async (request, reply) => reply.status(201).send(await auth.register(registerSchema.parse(request.body))));
  app.post("/auth/login", async (request) => auth.login(loginSchema.parse(request.body)));
  app.post("/auth/refresh", async (request) => auth.refresh(refreshSchema.parse(request.body).refreshToken));
  app.post("/auth/logout", { preHandler: authenticate }, async (request, reply) => {
    await auth.logout(request.user.sub, refreshSchema.parse(request.body).refreshToken);
    return reply.status(204).send();
  });

  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", authenticate);
    protectedApp.get("/accounts", apiController.listAccounts);
    protectedApp.post("/accounts", apiController.createAccount);
    protectedApp.patch("/accounts/:id", apiController.updateAccount);
    protectedApp.delete("/accounts/:id", apiController.deleteAccount);
    protectedApp.get("/categories", apiController.listCategories);
    protectedApp.post("/categories", apiController.createCategory);
    protectedApp.delete("/categories/:id", apiController.deleteCategory);
    protectedApp.get("/transactions", apiController.listTransactions);
    protectedApp.post("/transactions", apiController.createTransaction);
    protectedApp.patch("/transactions/:id", apiController.updateTransaction);
    protectedApp.delete("/transactions/:id", apiController.deleteTransaction);
    protectedApp.put("/budgets", apiController.setBudget);
    protectedApp.get("/budgets/status", apiController.budgetStatus);
    protectedApp.get("/dashboard/summary", apiController.summary);
    protectedApp.get("/analytics/monthly", apiController.monthly);
    protectedApp.get("/analytics/categories", apiController.categories);
    protectedApp.get("/analytics/calendar", apiController.calendar);
    protectedApp.get("/profile", apiController.me);
    protectedApp.patch("/profile", apiController.updateProfile);
    protectedApp.post("/profile/change-password", apiController.changePassword);

    protectedApp.get("/debts", apiController.listDebts);
    protectedApp.post("/debts", apiController.createDebt);
    protectedApp.post("/debts/:id/repay", apiController.repayDebt);
    protectedApp.delete("/debts/:id", apiController.deleteDebt);
    protectedApp.get("/debts/:id/repayments", apiController.listRepayments);
    protectedApp.post("/debts/:id/reminder-sent", apiController.markReminderSent);
  });
}


