import { withExif } from "./exif";
import { formatCoordinates } from "./options";

/**
 * Turns a camera frame into the photo that is sent: at most 1600 px on its long side, the GPS stamp burned
 * into the bottom-right corner (date, coordinates, place — like the GPS camera apps field teams use), JPEG,
 * with the position also written as EXIF.
 */

export interface StampInfo {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  takenAt: Date;
  /** Place lines, e.g. ["Rizal Avenue, Santa Cruz", "Manila"]. */
  place: string[];
}

const MAX_EDGE = 1600;

export function stampLines(info: StampInfo): string[] {
  const when = info.takenAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  return [when, formatCoordinates(info.latitude, info.longitude), ...info.place, "Philippines"];
}

function drawStamp(ctx: CanvasRenderingContext2D, width: number, height: number, info: StampInfo) {
  const lines = stampLines(info);
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.042));
  const lineHeight = Math.round(size * 1.25);
  const padding = Math.round(size * 0.6);
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const maxText = width * 0.8;
  // Long place names are cut to fit the stamp.
  const fitted = lines.map((line) => {
    let text = line;
    while (ctx.measureText(text).width > maxText && text.length > 4) text = `${text.slice(0, -2)}…`;
    return text;
  });
  const textWidth = Math.max(...fitted.map((l) => ctx.measureText(l).width));
  const boxW = textWidth + padding * 2;
  const brand = Math.round(size * 0.7);
  const boxH = fitted.length * lineHeight + padding * 2 + brand + Math.round(size * 0.3);
  const x = width - boxW - padding;
  const y = height - boxH - padding;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fbbf24";
  ctx.font = `700 ${brand}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("OKB FLOOD REPORT", x + boxW - padding, y + padding);
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 2;
  fitted.forEach((line, i) => {
    ctx.fillText(line, x + boxW - padding, y + padding + brand + Math.round(size * 0.3) + i * lineHeight);
  });
  ctx.shadowBlur = 0;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the photo"))), "image/jpeg", quality),
  );
}

/** The stamped, geotagged JPEG of a video frame or picked image. */
export async function capturePhoto(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  info: StampInfo,
): Promise<Blob> {
  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(source, 0, 0, width, height);
  drawStamp(ctx, width, height, info);
  let blob = await toBlob(canvas, 0.85);
  if (blob.size > 1_500_000) blob = await toBlob(canvas, 0.7);
  return withExif(blob, {
    latitude: info.latitude,
    longitude: info.longitude,
    accuracyM: info.accuracyM,
    takenAt: info.takenAt,
  });
}

/** Decodes a picked image file (camera app fallback), honoring its EXIF rotation. */
export async function decodeImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { source: bitmap, width: bitmap.width, height: bitmap.height };
}
