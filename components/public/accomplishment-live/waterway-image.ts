import { recordType, workStatus } from "@/features/accomplishment/lib/rollup";
import type { FieldPhoto } from "@/features/accomplishment/public-types";
import type { AccomplishmentData, AccomplishmentRecord } from "@/features/accomplishment/types";
import { dayText, int, km, pctText, photoUrl, recordProgress, STATUS } from "@/components/public/accomplishment-live/shared";

const W = 1080;
const PAD = 40;
const NAVY = "#002855";
const BLUE = "#0056d6";
const ORANGE = "#f57e20";
const GOLD = "#fcd116";
const MUTED = "#5b6b80";
const TEXT = "#14233a";
const TYPE = { waterway: "Waterway", drainage: "Drainage", isf: "Informal settlers (ISF)" } as const;

export interface WaterwayImageInput {
  record: AccomplishmentRecord;
  region: string;
  site: string;
  scale: AccomplishmentData["scale"];
  photos: FieldPhoto[];
  /** The live map canvas of the details sheet, when the line is traced. */
  map: HTMLCanvasElement | null;
  generatedAt?: string;
}

function loadPhoto(id: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = photoUrl(id, 600);
    window.setTimeout(() => resolve(null), 12_000);
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws the waterway details as one shareable PNG (summary, map, facts and field photos). */
export async function renderWaterwayImage(input: WaterwayImageInput): Promise<Blob> {
  const { record: w, region, site, scale, map } = input;
  const x = w.x ?? {};
  const pct = recordProgress(w, scale);
  const st = STATUS[workStatus(w, scale)];
  const body = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const display = getComputedStyle(document.querySelector(".font-display") ?? document.body).fontFamily || body;
  await document.fonts?.ready;

  const facts: [string, string][] = [
    ["Volume removed", w.v !== null ? `${int(w.v)} m³` : "—"],
    ["Planned volume", w.p !== null ? `${int(w.p)} m³` : "—"],
  ];
  if (w.al !== null || w.pl !== null) facts.push(["Length cleaned", `${w.al !== null ? km(w.al) : "—"}${w.pl ? ` of ${km(w.pl)}` : ""}`]);
  if (x.tp) facts.push(["Traced points cleaned", `${int(x.cp ?? 0)} of ${int(x.tp)} (${pctText((100 * (x.cp ?? 0)) / x.tp, 0)})`]);
  if (x.ts || x.te) facts.push(["Target schedule", [x.ts && dayText(x.ts), x.te && dayText(x.te)].filter(Boolean).join(" – ")]);
  if (x.city) facts.push(["City / municipality", x.city]);
  if (w.o) facts.push(["Implementing office", w.o]);
  if (w.lu) facts.push(["Last field update", dayText(w.lu)]);
  facts.push(["Region · site", [region, site].filter(Boolean).join(" · ") || "—"]);

  const photos = (await Promise.all(input.photos.slice(0, 6).map((p) => loadPhoto(p.id)))).filter((i): i is HTMLImageElement => Boolean(i));

  // Measure first so the canvas is the right height.
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = `700 54px ${display}`;
  const titleLines = wrap(probe, w.n.toUpperCase(), W - PAD * 2);
  const headerH = 70 + titleLines.length * 58 + 44;
  const mapH = map && map.width > 0 ? Math.round(((W - PAD * 2) * 0.45)) : 0;
  const factRows = Math.ceil(facts.length / 2);
  const cell = (W - PAD * 2 - 16) / 3;
  const photoRows = Math.ceil(photos.length / 3);
  const H = headerH + 300 + (mapH ? mapH + 40 : 0) + 24 + factRows * 96 + (photos.length ? 56 + photoRows * (cell + 16) : 0) + 90;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#eef2f7";
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = GOLD;
  ctx.font = `800 20px ${body}`;
  ctx.fillText("OPLAN KONTRA BAHA  ·  DPWH ACCOMPLISHMENT", PAD, 52);
  ctx.fillStyle = "#fff";
  ctx.font = `700 54px ${display}`;
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, 118 + i * 58));
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `500 22px ${body}`;
  ctx.fillText([region, site, x.city].filter(Boolean).join(" · "), PAD, headerH - 20);

  // Summary card
  let y = headerH + 24;
  ctx.fillStyle = "#fff";
  roundRect(ctx, PAD, y, W - PAD * 2, 252, 20);
  ctx.fill();
  ctx.font = `700 20px ${body}`;
  const pill = (label: string, px: number, bg: string, fg: string) => {
    const tw = ctx.measureText(label).width + 32;
    ctx.fillStyle = bg;
    roundRect(ctx, px, y + 24, tw, 40, 20);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(label, px + 16, y + 51);
    return px + tw + 12;
  };
  const px = pill(st.label, PAD + 24, st.bg, st.color);
  pill(TYPE[recordType(w)], px, "#e6efff", BLUE);
  ctx.fillStyle = NAVY;
  ctx.font = `700 92px ${display}`;
  ctx.fillText(pctText(pct), PAD + 24, y + 160);
  const pw = ctx.measureText(pctText(pct)).width;
  ctx.fillStyle = MUTED;
  ctx.font = `500 26px ${body}`;
  ctx.fillText("accomplished", PAD + 24 + pw + 14, y + 160);
  // progress bar
  const barW = W - PAD * 2 - 48;
  ctx.fillStyle = "#dbe3ee";
  roundRect(ctx, PAD + 24, y + 182, barW, 20, 10);
  ctx.fill();
  if (pct !== null && pct > 0) {
    const g = ctx.createLinearGradient(PAD + 24, 0, PAD + 24 + barW, 0);
    g.addColorStop(0, "#0038a8");
    g.addColorStop(1, "#2f7bef");
    ctx.fillStyle = g;
    roundRect(ctx, PAD + 24, y + 182, Math.max(20, (barW * Math.min(100, pct)) / 100), 20, 10);
    ctx.fill();
  }
  ctx.fillStyle = MUTED;
  ctx.font = `500 21px ${body}`;
  ctx.fillText(`${w.v !== null ? `${int(w.v)} m³ removed` : "No volume reported yet"}${w.p ? ` of ${int(w.p)} m³ planned` : ""}`, PAD + 24, y + 234);
  y += 252 + 24;

  // Map
  if (mapH && map) {
    const mw = W - PAD * 2;
    ctx.save();
    roundRect(ctx, PAD, y, mw, mapH, 20);
    ctx.clip();
    const scaleF = Math.max(mw / map.width, mapH / map.height);
    const dw = map.width * scaleF;
    const dh = map.height * scaleF;
    ctx.drawImage(map, PAD + (mw - dw) / 2, y + (mapH - dh) / 2, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    roundRect(ctx, PAD, y, mw, mapH, 20);
    ctx.stroke();
    // legend
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, PAD + 14, y + mapH - 54, 330, 40, 10);
    ctx.fill();
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(PAD + 28, y + mapH - 38, 28, 8);
    ctx.fillStyle = TEXT;
    ctx.font = `600 18px ${body}`;
    ctx.fillText("Cleaned", PAD + 64, y + mapH - 28);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(PAD + 160, y + mapH - 38, 28, 8);
    ctx.fillStyle = TEXT;
    ctx.fillText("Not yet cleaned", PAD + 196, y + mapH - 28);
    y += mapH + 40;
  }

  // Facts
  const fw = (W - PAD * 2 - 16) / 2;
  facts.forEach(([label, value], i) => {
    const fx = PAD + (i % 2) * (fw + 16);
    const fy = y + Math.floor(i / 2) * 96;
    ctx.fillStyle = "#fff";
    roundRect(ctx, fx, fy, fw, 80, 12);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.font = `800 15px ${body}`;
    ctx.fillText(label.toUpperCase(), fx + 18, fy + 28);
    ctx.fillStyle = TEXT;
    ctx.font = `700 24px ${body}`;
    let v = value;
    while (v.length > 4 && ctx.measureText(v).width > fw - 36) v = `${v.slice(0, -2)}…`;
    ctx.fillText(v, fx + 18, fy + 60);
  });
  y += factRows * 96 + 8;

  // Photos
  if (photos.length) {
    ctx.fillStyle = NAVY;
    ctx.font = `800 20px ${body}`;
    ctx.fillText(`FIELD PHOTOS · ${x.ph ?? photos.length}`, PAD, y + 30);
    y += 56;
    photos.forEach((img, i) => {
      const ix = PAD + (i % 3) * (cell + 8);
      const iy = y + Math.floor(i / 3) * (cell + 16);
      ctx.save();
      roundRect(ctx, ix, iy, cell, cell, 14);
      ctx.clip();
      const s = Math.max(cell / img.naturalWidth, cell / img.naturalHeight);
      ctx.drawImage(img, ix + (cell - img.naturalWidth * s) / 2, iy + (cell - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.restore();
    });
    y += photoRows * (cell + 16);
  }

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = `500 18px ${body}`;
  ctx.fillText(`OKB Single Source of Truth${input.generatedAt ? ` · updated ${input.generatedAt}` : ""} · okb-ousc.site/accomplishment`, PAD, H - 34);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be created."))), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
