import { openDriveFile } from "@/lib/river-basin/drive-file";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_CACHE_BYTES = 36 * 1024 * 1024;

type SharedDownload = {
  chunks: Uint8Array[];
  received: number;
  contentLength: number | null;
  done: boolean;
  error: Error | null;
  bytes: Uint8Array | null;
  waiters: Array<() => void>;
};

const cache = new Map<string, Uint8Array>();
const cacheOrder: string[] = [];
let cacheBytes = 0;
const inflight = new Map<string, SharedDownload>();

/** Whole-file bytes when this instance already holds the study in memory. */
export function getCachedStudyBytes(fileId: string): Uint8Array | undefined {
  const cached = cache.get(fileId);
  if (cached) touch(fileId);
  return cached;
}

export type SharedStudy = {
  contentLength: number | null;
  fromCache: boolean;
  stream: () => ReadableStream<Uint8Array>;
  bytes: Promise<Uint8Array | null>;
};

/** One Google download, shared by the viewer and any prefetch of the same file. */
export async function openSharedStudy(fileId: string): Promise<SharedStudy> {
  const cached = cache.get(fileId);
  if (cached) {
    touch(fileId);
    return {
      contentLength: cached.byteLength,
      fromCache: true,
      stream: () => streamFromBytes(cached),
      bytes: Promise.resolve(cached),
    };
  }

  const existing = inflight.get(fileId);
  if (existing) return asShared(existing, false);

  const download: SharedDownload = {
    chunks: [],
    received: 0,
    contentLength: null,
    done: false,
    error: null,
    bytes: null,
    waiters: [],
  };
  inflight.set(fileId, download);

  try {
    const file = await openDriveFile(fileId);
    download.contentLength = file.contentLength;
    void pump(fileId, download, file.body);
  } catch (error) {
    download.error =
      error instanceof Error ? error : new Error("Study download failed.");
    download.done = true;
    inflight.delete(fileId);
    wake(download);
    throw download.error;
  }

  return asShared(download, false);
}

function asShared(download: SharedDownload, fromCache: boolean): SharedStudy {
  return {
    contentLength: download.contentLength,
    fromCache,
    stream: () => streamFromDownload(download),
    bytes: new Promise((resolve, reject) => {
      const finish = () => {
        if (!download.done && !download.error) {
          download.waiters.push(finish);
          return;
        }
        if (download.error) reject(download.error);
        else resolve(download.bytes);
      };
      finish();
    }),
  };
}

async function pump(
  fileId: string,
  download: SharedDownload,
  body: ReadableStream<Uint8Array>,
): Promise<void> {
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      download.chunks.push(value);
      download.received += value.byteLength;
      wake(download);
    }
    download.bytes = concat(download.chunks, download.received);
    if (download.bytes.byteLength <= MAX_FILE_BYTES)
      store(fileId, download.bytes);
    download.done = true;
  } catch (error) {
    download.error =
      error instanceof Error ? error : new Error("Study download failed.");
    download.done = true;
  } finally {
    inflight.delete(fileId);
    wake(download);
  }
}

function streamFromDownload(
  download: SharedDownload,
): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      while (
        index >= download.chunks.length &&
        !download.done &&
        !download.error
      ) {
        await new Promise<void>((resolve) => {
          download.waiters.push(resolve);
        });
      }
      if (index < download.chunks.length) {
        const chunk = download.chunks[index];
        index += 1;
        if (chunk) controller.enqueue(chunk);
        return;
      }
      if (download.error) {
        controller.error(download.error);
        return;
      }
      controller.close();
    },
  });
}

function streamFromBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function wake(download: SharedDownload): void {
  const waiters = download.waiters;
  download.waiters = [];
  for (const waiter of waiters) waiter();
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function store(fileId: string, bytes: Uint8Array): void {
  const previous = cache.get(fileId);
  if (previous) {
    cacheBytes -= previous.byteLength;
    const index = cacheOrder.indexOf(fileId);
    if (index >= 0) cacheOrder.splice(index, 1);
  }
  cache.set(fileId, bytes);
  cacheOrder.push(fileId);
  cacheBytes += bytes.byteLength;
  while (cacheBytes > MAX_CACHE_BYTES && cacheOrder.length > 1) {
    const oldest = cacheOrder.shift();
    if (!oldest) break;
    const removed = cache.get(oldest);
    cache.delete(oldest);
    cacheBytes -= removed?.byteLength ?? 0;
  }
}

function touch(fileId: string): void {
  const index = cacheOrder.indexOf(fileId);
  if (index >= 0) cacheOrder.splice(index, 1);
  cacheOrder.push(fileId);
}

export function sliceRange(
  bytes: Uint8Array,
  header: string,
): { start: number; end: number; body: Uint8Array } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;
  const size = bytes.byteLength;
  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  let start: number;
  let end: number;

  if (startText === "") {
    const suffix = Number(endText);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText === "" ? size - 1 : Number(endText);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < 0 || start >= size) return null;
    end = Math.min(end, size - 1);
    if (end < start) return null;
  }

  return { start, end, body: bytes.subarray(start, end + 1) };
}
