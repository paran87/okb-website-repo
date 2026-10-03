// Uploads the chunk PDFs made by split_pdfs.py to Cloudflare R2 (resumable).
//
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=... \
//   node scripts/river-basin-studies/upload-r2-chunks.mjs /path/to/chunks
// Layout: <dir>/<studyId>/<n>.pdf  ->  river-basin-studies/chunks/<studyId>/<n>.pdf
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const dir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the chunks directory.");
for (const [name, value] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!value) throw new Error(`Set ${name}.`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const jobs = [];
for (const study of await readdir(dir)) {
  const folder = path.join(dir, study);
  if (!(await stat(folder)).isDirectory()) continue;
  for (const file of await readdir(folder)) if (file.endsWith(".pdf")) jobs.push([study, file]);
}

async function exists(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return head.ContentLength === size;
  } catch {
    return false;
  }
}

let done = 0;
async function worker() {
  while (jobs.length) {
    const [study, file] = jobs.shift();
    const full = path.join(dir, study, file);
    const key = `river-basin-studies/chunks/${study}/${file}`;
    const size = (await stat(full)).size;
    if (!(await exists(key, size))) {
      await new Upload({
        client,
        params: { Bucket: R2_BUCKET, Key: key, Body: createReadStream(full), ContentType: "application/pdf", CacheControl: "public, max-age=31536000, immutable" },
        partSize: 16 * 1024 * 1024,
      }).done();
    }
    done += 1;
    if (done % 50 === 0) console.log(`${done} uploaded`);
  }
}
const total = jobs.length;
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`Uploaded ${total} chunk files`);
