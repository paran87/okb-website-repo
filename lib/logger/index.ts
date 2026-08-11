import "server-only";
import pino, { type Logger } from "pino";
import { serverEnv } from "@/lib/env/server";

/**
 * Structured application logger (server-only).
 *
 * - JSON output in production for ingestion by log pipelines.
 * - Pretty output in development for readability.
 * - Global redaction of sensitive fields to prevent credential/token leakage.
 */
const redactPaths = [
  "password",
  "*.password",
  "req.headers.authorization",
  "req.headers.cookie",
  "authorization",
  "token",
  "*.token",
  "accessToken",
  "refreshToken",
  "secret",
  "*.secret",
];

const isProduction = serverEnv.NODE_ENV === "production";

export const logger: Logger = pino({
  level: serverEnv.LOG_LEVEL,
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  base: { service: "okb-command-center", env: serverEnv.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

/**
 * Create a child logger bound to a specific context (e.g. a feature or
 * request). Prefer this over the root logger inside feature/service code.
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}
