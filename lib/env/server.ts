import "server-only";
import { z } from "zod";
import { omitBlankEnv } from "@/lib/env/omit-blank";

/**
 * Server-side environment schema.
 *
 * Validated once at module load so misconfiguration fails fast at boot rather
 * than surfacing as opaque runtime errors. NEVER import this file from client
 * components — it is guarded by `server-only`.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_NAME: z.string().min(1).default("OKB Command Center"),

  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string")
    .default(
      "postgresql://okb:okb_password@127.0.0.1:5432/okb_command_center?schema=public",
    ),

  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters")
    .default("vercel-build-placeholder-secret"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((value) => value === "true"),

  MAP_API_KEY: z.string().optional().default(""),
  WEATHER_API_KEY: z.string().optional().default(""),

  UPLOAD_STORAGE: z.enum(["local", "minio", "s3"]).default("local"),
  UPLOAD_STORAGE_PATH: z.string().default("./public/uploads"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(omitBlankEnv(process.env));

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n` +
        "Check your .env file against .env.example.",
    );
  }

  return parsed.data;
}

export const serverEnv: ServerEnv = loadServerEnv();
