import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) =>
  path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name,
  );

/**
 * Production build for Vercel/CI.
 *
 * Prisma requires DATABASE_URL at generate time, and API routes import env
 * validation during `next build`. Hosted deploys of the public site may not
 * have those secrets configured, so placeholders are supplied only when unset.
 */
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL?.trim() ||
    "postgresql://okb:okb_password@127.0.0.1:5432/okb_command_center?schema=public",
  AUTH_SECRET:
    process.env.AUTH_SECRET?.trim() || "vercel-build-placeholder-secret",
};

function run(command, args) {
  // Windows needs a shell to run the .cmd shims, and Node passes the command
  // through verbatim in that mode, so a root path containing spaces has to be
  // quoted here or cmd splits it into separate arguments.
  const shell = process.platform === "win32";
  const result = spawnSync(shell ? `"${command}"` : command, args, {
    cwd: root,
    stdio: "inherit",
    env,
    shell,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(bin("prisma"), ["generate"]);
run(bin("next"), ["build"]);
