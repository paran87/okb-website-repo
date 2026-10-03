// Uploads optimized studies to Vercel Blob and writes the id -> URL manifest.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/river-basin-studies/upload.mjs /path/to/out
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const dir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the optimized output directory.");
if (!process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error("Set BLOB_READ_WRITE_TOKEN.");

const manifestPath = path.resolve("lib/config/river-basin-blob.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = (await readdir(dir)).filter(
  (f) => f.endsWith(".pdf") && !f.includes(".tmp"),
);

let done = 0;
const queue = [...files];
async function worker() {
  while (queue.length) {
    const file = queue.shift();
    const id = file.replace(/\.pdf$/, "");
    const body = await readFile(path.join(dir, file));
    const blob = await put(`river-basin-studies/${id}.pdf`, body, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    manifest[id] = blob.url;
    done += 1;
    console.log(
      `${done}/${files.length} ${id} ${(body.length / 1e6).toFixed(1)} MB`,
    );
  }
}
await Promise.all([worker(), worker(), worker()]);
await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`Wrote ${Object.keys(manifest).length} URLs to ${manifestPath}`);
