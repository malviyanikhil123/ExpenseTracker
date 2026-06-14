import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 10 : 3,
  prepare: false,
});

export const db = drizzle(client, { schema });

export async function closeDatabase() {
  await client.end();
}
