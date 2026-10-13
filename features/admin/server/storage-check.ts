import "server-only";
import {
  deleteObject,
  describeOperationsR2Env,
  getOperationsR2Config,
  probeList,
  putObject,
  R2Error,
} from "@/features/operations/server/r2";
import type { StorageCheck, StorageCheckStep } from "@/features/admin/types";

/**
 * Admin → Setup → Storage check: which bucket the site uses (names only, no
 * secrets) and whether the R2 key can list, upload and delete there, with a
 * plain-language fix for each failure.
 */

function hint(code: string, bucket: string, bucketFromEnv: boolean): string {
  switch (code) {
    case "AccessDenied":
      return bucketFromEnv
        ? `The R2 key is not allowed to use the bucket "${bucket}". In Cloudflare, give the API token "Object Read & Write" on exactly this bucket, or set OPERATIONS_R2_BUCKET to the bucket the token is for.`
        : `OPERATIONS_R2_BUCKET is not set, so the site uses the default name "${bucket}". Set OPERATIONS_R2_BUCKET to your bucket's exact name, and make sure the API token has "Object Read & Write" on it.`;
    case "InvalidAccessKeyId":
      return "The Access Key ID is not a valid R2 key for this account. Copy the Access Key ID shown when the R2 API token was created (not the Cloudflare API token value).";
    case "SignatureDoesNotMatch":
    case "AuthorizationQueryParametersError":
      return "The Secret Access Key does not match the Access Key ID. Paste the token's Secret Access Key again (no spaces or quotes).";
    case "NoSuchBucket":
      return `No bucket named "${bucket}" exists at this endpoint. Check the name, and set OPERATIONS_R2_JURISDICTION=eu if the bucket is in the EU jurisdiction.`;
    case "NetworkError":
      return "The R2 endpoint could not be reached. Check the account ID / endpoint (OPERATIONS_R2_ENDPOINT or OPERATIONS_R2_ACCOUNT_ID).";
    default:
      return `Cloudflare R2 answered "${code}".`;
  }
}

function maskAccount(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

export async function runStorageCheck(): Promise<StorageCheck> {
  const env = describeOperationsR2Env();
  const cfg = getOperationsR2Config();
  if (!cfg) {
    return { configured: false, bucket: null, bucketFromEnv: Boolean(env.bucketVar), host: null, account: null, env, steps: [], ok: false };
  }
  const bucketFromEnv = Boolean(env.bucketVar);
  const steps: StorageCheckStep[] = [];
  const run = async (id: StorageCheckStep["id"], label: string, fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      steps.push({ id, label, ok: true, code: null, hint: null });
      return true;
    } catch (err) {
      const code = err instanceof R2Error ? err.code || String(err.status) : "Error";
      steps.push({ id, label, ok: false, code, hint: hint(code, cfg.bucket, bucketFromEnv) });
      return false;
    }
  };

  const testKey = `_okb-admin-check/${Date.now()}.txt`;
  const listed = await run("list", "List files in the bucket", () => probeList(cfg));
  const wrote = await run("write", "Upload a test file", () =>
    putObject(cfg, testKey, new TextEncoder().encode("okb admin storage check").buffer as ArrayBuffer, "text/plain"),
  );
  if (wrote) await run("delete", "Delete the test file", () => deleteObject(cfg, testKey));

  return {
    configured: true,
    bucket: cfg.bucket,
    bucketFromEnv,
    host: cfg.host.replace(cfg.accountId, maskAccount(cfg.accountId)),
    account: maskAccount(cfg.accountId),
    env,
    steps,
    ok: listed && wrote && steps.every((s) => s.ok),
  };
}
