// Uploads the optimized study PDFs to a Cloudflare R2 bucket and records them.
// Resumable: files already in the bucket with the same size are skipped.
//
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   R2_BUCKET=... R2_PUBLIC_URL=https://pub-xxxx.r2.dev \
//   node scripts/river-basin-studies/upload-r2.mjs /path/to/optimized/pdfs
import { createReadStream } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;
const dir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the directory of optimized PDFs.");
for (const [name, value] of Object.entries({
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
})) {
  if (!value) throw new Error(`Set ${name}.`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const origin = new URL(R2_PUBLIC_URL).origin;
const files = (await readdir(dir)).filter(
  (f) => f.endsWith(".pdf") && !f.includes(".tmp"),
);
const manifestPath = path.resolve("lib/config/river-basin-blob.json");
const manifest = {};

async function exists(key, size) {
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
    return head.ContentLength === size;
  } catch {
    return false;
  }
}

let done = 0;
const queue = [...files];
async function worker() {
  while (queue.length) {
    const file = queue.shift();
    const id = file.replace(/\.pdf$/, "");
    const key = `river-basin-studies/${file}`;
    const size = (await stat(path.join(dir, file))).size;
    if (!(await exists(key, size))) {
      await new Upload({
        client,
        params: {
          Bucket: R2_BUCKET,
          Key: key,
          Body: createReadStream(path.join(dir, file)),
          ContentType: "application/pdf",
          CacheControl: "public, max-age=31536000, immutable",
        },
        partSize: 16 * 1024 * 1024,
        queueSize: 4,
      }).done();
    }
    manifest[id] = `${origin}/${key}`;
    done += 1;
    console.log(`${done}/${files.length} ${id} ${(size / 1e6).toFixed(1)} MB`);
  }
}
await Promise.all([worker(), worker(), worker()]);

await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
await writeFile(
  path.resolve("lib/config/study-storage.json"),
  JSON.stringify({ origin }, null, 2) + "\n",
);
console.log(
  `Uploaded ${files.length} studies; storage origin set to ${origin}`,
);
