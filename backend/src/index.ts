import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { env } from "./config/env.js";
import { closeDatabase } from "./db/index.js";
import { errorHandler } from "./lib/errors.js";
import { routes } from "./routes/index.js";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, {
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((value) => value.trim()),
  credentials: env.CORS_ORIGIN !== "*",
});
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRES_IN as never } });
app.setErrorHandler(errorHandler);
await app.register(routes, { prefix: "/api" });

const shutdown = async () => {
  await app.close();
  await closeDatabase();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
