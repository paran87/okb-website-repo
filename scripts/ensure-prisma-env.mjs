import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

const fallbackUrl =
  "postgresql://okb:okb_password@127.0.0.1:5432/okb_command_center?schema=public";
const fallbackSecret = "vercel-build-placeholder-secret";

/** Prisma generate reads DATABASE_URL from `.env` during npm install on Vercel. */
if (!process.env.DATABASE_URL && !fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    [
      `DATABASE_URL="${fallbackUrl}"`,
      `AUTH_SECRET="${fallbackSecret}"`,
      "",
    ].join("\n"),
  );
}
