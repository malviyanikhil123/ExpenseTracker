import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { accounts, refreshTokens } from "../db/schema/index.js";
import { seedDefaultCategories } from "../db/seeds/default-categories.js";
import { AppError } from "../lib/errors.js";
import { userRepository } from "../repositories/user.repository.js";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function authService(app: FastifyInstance) {
  async function issueTokens(user: { id: string; email: string }) {
    const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000);
    await db.insert(refreshTokens).values({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt });
    return { accessToken, refreshToken, expiresAt };
  }

  return {
    async register(input: { fullName: string; email: string; password: string }) {
      if (await userRepository.findByEmail(input.email)) throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await userRepository.create({ fullName: input.fullName, email: input.email, passwordHash });
      await db.transaction(async (tx) => {
        await tx.insert(accounts).values({ userId: user.id, name: "Wallet", icon: "wallet" });
        await seedDefaultCategories(tx, user.id);
      });
      return { user: { id: user.id, fullName: user.fullName, email: user.email }, ...(await issueTokens(user)) };
    },
    async login(input: { email: string; password: string }) {
      const user = await userRepository.findByEmail(input.email);
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
      }
      return { user: { id: user.id, fullName: user.fullName, email: user.email }, ...(await issueTokens(user)) };
    },
    async refresh(token: string) {
      const stored = await db.query.refreshTokens.findFirst({ where: eq(refreshTokens.tokenHash, hashToken(token)) });
      if (!stored || stored.expiresAt <= new Date()) throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
      const user = await userRepository.findById(stored.userId);
      if (!user) throw new AppError("User not found", 401, "INVALID_REFRESH_TOKEN");
      await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
      return issueTokens(user);
    },
    logout: (userId: string, token: string) =>
      db.delete(refreshTokens).where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tokenHash, hashToken(token)))),
  };
}
