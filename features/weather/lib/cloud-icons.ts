import type { Map as MapLibreMap } from "maplibre-gl";

export const CLOUD_ICON_PREFIX = "weather-cloud-";

const CLOUD_COLORS: Record<string, string> = {
  sunny: "#eab308",
  "partly-cloudy": "#84cc16",
  cloudy: "#64748b",
  "rain-showers": "#0d9488",
  rain: "#2563eb",
  thunderstorms: "#ea580c",
  "monsoon-rain": "#dc2626",
};

// Compact canvas keeps the weather markers visually lighter on the map.
const W = 64;
const H = 46;
const RATIO = 2;

function cloudPath(ctx: CanvasRenderingContext2D, dx = 0, dy = 0) {
  ctx.beginPath();
  ctx.arc(24 + dx, 34 + dy, 13, 0, Math.PI * 2);
  ctx.arc(40 + dx, 24 + dy, 17, 0, Math.PI * 2);
  ctx.arc(57 + dx, 34 + dy, 13, 0, Math.PI * 2);
  ctx.rect(24 + dx, 34 + dy, 33, 13);
}

function drawIcon(condition: string, color: string): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = W * RATIO;
  canvas.height = H * RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(RATIO, RATIO);
  ctx.lineJoin = "round";

  if (condition === "sunny" || condition === "partly-cloudy") {
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(condition === "sunny" ? 40 : 26, condition === "sunny" ? 28 : 18, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }

  if (condition !== "sunny") {
    const dx = condition === "partly-cloudy" ? 4 : 0;
    const dy = condition === "partly-cloudy" ? 4 : 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    cloudPath(ctx, dx, dy);
    ctx.stroke();
    ctx.fillStyle = condition === "partly-cloudy" ? "#e2e8f0" : color;
    cloudPath(ctx, dx, dy);
    ctx.fill();
  }

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  if (condition === "rain-showers" || condition === "rain" || condition === "monsoon-rain") {
    const drops = condition === "rain-showers" ? [32, 46] : [28, 40, 52];
    for (const x of drops) {
      ctx.beginPath();
      ctx.moveTo(x, 38);
      ctx.lineTo(x - 3, 48);
      ctx.stroke();
    }
  } else if (condition === "thunderstorms") {
    ctx.beginPath();
    ctx.moveTo(43, 33);
    ctx.lineTo(34, 44);
    ctx.lineTo(41, 44);
    ctx.lineTo(37, 53);
    ctx.lineTo(50, 40);
    ctx.lineTo(43, 40);
    ctx.closePath();
    ctx.fillStyle = "#fde047";
    ctx.fill();
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Registers one cloud icon per weather condition (idempotent). */
export function ensureCloudIcons(map: MapLibreMap): void {
  if (typeof document === "undefined") return;
  for (const [condition, color] of Object.entries(CLOUD_COLORS)) {
    const name = `${CLOUD_ICON_PREFIX}${condition}`;
    if (map.hasImage(name)) continue;
    const image = drawIcon(condition, color);
    if (image) map.addImage(name, image, { pixelRatio: RATIO });
  }
}
