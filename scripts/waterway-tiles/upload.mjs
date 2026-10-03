// Uploads the pre-rendered river tiles to Vercel Blob and switches them on.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/waterway-tiles/upload.mjs /path/to/tiles
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const dir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the tiles directory.");
if (!process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error("Set BLOB_READ_WRITE_TOKEN.");

const configPath = path.resolve("lib/config/waterway-tiles.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

const files = [];
for (const z of await readdir(dir)) {
  for (const x of await readdir(path.join(dir, z))) {
    for (const file of await readdir(path.join(dir, z, x))) {
      if (
        file.endsWith(".png") &&
        (await stat(path.join(dir, z, x, file))).isFile()
      )
        files.push([z, x, file]);
    }
  }
}

let done = 0;
const queue = [...files];
let origin = null;
async function worker() {
  while (queue.length) {
    const [z, x, file] = queue.shift();
    const blob = await put(
      `waterway-tiles/${config.version}/${z}/${x}/${file}`,
      await readFile(path.join(dir, z, x, file)),
      {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      },
    );
    origin ??= new URL(blob.url).origin;
    done += 1;
    if (done % 50 === 0 || done === files.length)
      console.log(`${done}/${files.length}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
config.enabled = true;
await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
console.log(
  `Uploaded ${files.length} tiles to ${origin}; enabled in ${configPath}`,
);
