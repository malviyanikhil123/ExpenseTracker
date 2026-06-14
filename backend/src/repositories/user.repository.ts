import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { AppError } from "../lib/errors.js";

export const userRepository = {
  findByEmail: (email: string) => db.query.users.findFirst({ where: eq(users.email, email) }),
  findById: (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }),
  async create(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    if (!user) throw new AppError("Unable to create user", 500, "CREATE_FAILED");
    return user;
  },
  async updateName(id: string, fullName: string) {
    const [user] = await db
      .update(users)
      .set({ fullName, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },
  updatePassword: (id: string, passwordHash: string) =>
    db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id)),
};
