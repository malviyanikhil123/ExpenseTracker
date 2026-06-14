import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "BAD_REQUEST",
  ) {
    super(message);
  }
}

export function errorHandler(
  error: Error & { statusCode?: number; code?: string },
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: error.flatten(),
    });
  }

  const statusCode = error instanceof AppError ? error.statusCode : error.statusCode ?? 500;
  return reply.status(statusCode).send({
    error: error instanceof AppError ? error.code : "INTERNAL_SERVER_ERROR",
    message: statusCode >= 500 ? "Something went wrong" : error.message,
  });
}

