#!/usr/bin/env node
/**
 * Lists every photo in the public Google Drive folder behind the Gallery → Photos tab and writes
 * lib/config/gallery-drive.json (file id, date, place, stage). Re-run it when photos are added:
 *
 *   node scripts/gallery-drive/crawl.mjs [folderId]
 *
 * It reads Drive's public "embedded folder view" (no login or API key), so the folder must be shared as
 * "Anyone with the link". Photos are then shown through drive.google.com/thumbnail on the site.
 */
import { writeFileSync } from "node:fs";

const ROOT = process.argv[2] ?? "18lBJYYYQACXPHtvvsVpY3BE16lxABuA1";
const OUT = new URL("../../lib/config/gallery-drive.json", import.meta.url);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IMAGE = /\.(jpe?g|png|webp|gif|heic)$/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const NOW = new Date();

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

async function list(id, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      return html
        .split(/(?=<div class="flip-entry" id="entry-)/)
        .slice(1)
        .map((blk) => ({
          id: /id="entry-([\w-]+)"/.exec(blk)?.[1] ?? "",
          title: decode(/flip-entry-title">([\s\S]*?)<\/div>/.exec(blk)?.[1] ?? ""),
          folder: blk.includes('aria-label="Folder"'),
          modified: decode(/flip-entry-last-modified"><div>([\s\S]*?)<\/div>/.exec(blk)?.[1] ?? ""),
        }));
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  return [];
}

/** "Oct 4" (this year, or last year when that would be in the future) or "Oct 4, 2025" → "YYYY-MM-DD". */
function modifiedDate(text) {
  const m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:, (\d{4}))?$/.exec(text);
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || month < 0) return null;
  let year = m[3] ? Number(m[3]) : NOW.getFullYear();
  if (!m[3] && new Date(Date.UTC(year, month, Number(m[2]))) > NOW) year -= 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

/** "APRIL 16, 2026. BEFORE DURING & AFTER" → "2026-04-16". */
function nameDate(name) {
  const m = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s+(\d{1,2})(?:,|\.)?\s+(20\d{2})/i.exec(name);
  if (!m) return null;
  return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

/**
 * "DEO: Quezon City 1st District Engineering Office Location: Culiat Creek, Quezon City Activity Conducted: Declogging"
 * → office / location / activity. Folders named some other way ("SMDEO - Declogging along Bonifacio Drive") keep their
 * whole name as the label.
 */
function parsePlace(name) {
  const office = /^(?:DEOs?'?s?|DEO)\s*:\s*(.*?)\s*(?:Location|Activity(?: Conducted)?)\s*:/i.exec(name)?.[1];
  const location = /Location\s*:\s*(.*?)\s*(?:Activity(?: Conducted)?\s*:|$)/i.exec(name)?.[1];
  const activity = /Activity(?: Conducted)?\s*:\s*(.*)$/i.exec(name)?.[1];
  const clean = (v) => (v ? v.trim().replace(/\s+(BEFORE|DURING|AFTER)$/i, "").replace(/[.,;:]+$/, "") || null : null);
  return { office: clean(office), location: clean(location), activity: clean(activity), label: name };
}

/** Folders that only say when (or which stage) are not places. */
const isDateFolder = (name) => nameDate(name) !== null || /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*$/i.test(name);
// Folder names are typed by hand ("DUING", "AFRER", "FTER", "BEFORRE", "DDURING"), so the stage words are matched loosely.
const STAGE = /^(BE|BF|DU|DD|AF|AR|FT)[A-Z]*\W*$/i;
const isStageFolder = (name) => name.trim().length <= 10 && STAGE.test(name.trim());
const stageOf = (name) => {
  const w = name.trim().toUpperCase();
  return w.startsWith("B") ? "before" : w.startsWith("D") ? "during" : "after";
};

const photos = [];
const places = [];
const placeIndex = new Map();
let folders = 0;

function placeOf(path) {
  const name = [...path].reverse().find((p) => !isDateFolder(p) && !isStageFolder(p));
  if (!name) return -1;
  if (!placeIndex.has(name)) {
    placeIndex.set(name, places.length);
    places.push(parsePlace(name));
  }
  return placeIndex.get(name);
}

async function walk(id, path, dayFromPath) {
  const entries = await list(id);
  folders += 1;
  const subfolders = [];
  for (const e of entries) {
    if (e.folder) {
      subfolders.push(e);
      continue;
    }
    if (!IMAGE.test(e.title)) continue;
    const stage = path.filter(isStageFolder).map(stageOf).pop() ?? null;
    // [file id, date (YYYY-MM-DD), place index, stage]
    photos.push([e.id, dayFromPath ?? modifiedDate(e.modified), placeOf(path), stage]);
  }
  // A few folders at a time keeps it quick without hammering Drive.
  for (let i = 0; i < subfolders.length; i += 4) {
    await Promise.all(
      subfolders.slice(i, i + 4).map((f) => walk(f.id, [...path, f.title], nameDate(f.title) ?? dayFromPath)),
    );
  }
}

await walk(ROOT, [], null);
photos.sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? "") || a[0].localeCompare(b[0]));
writeFileSync(
  OUT,
  JSON.stringify({ folderId: ROOT, generatedAt: NOW.toISOString(), places, photos }) + "\n",
);
console.log(`${photos.length} photos in ${folders} folders → lib/config/gallery-drive.json`);
