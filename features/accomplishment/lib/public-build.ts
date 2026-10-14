/**
 * The public Accomplishment dashboard, built from the OKB SSOT tabs on top of the progress tree (build.ts):
 * waterway details, field photos, traced lines, equipment and manpower, and the field update logs.
 * Only named columns are read; e-mail addresses and passwords in the sheet are never picked.
 */
import { buildAccomplishment, key, looseKey, num, pick, table, val, type AccomplishmentTabs } from "@/features/accomplishment/lib/build";
import { dayOrder, isoDay, parseSheetDate } from "@/features/accomplishment/lib/dates";
import { recordPct, regionLabel } from "@/features/accomplishment/lib/rollup";
import type {
  FieldPhoto,
  FieldUpdate,
  LineExtension,
  MapLine,
  PublicAccomplishment,
  Quantity,
  SiteResources,
} from "@/features/accomplishment/public-types";
import type { AccomplishmentData, AccomplishmentRecord, RecordExtra, SheetRows } from "@/features/accomplishment/types";

export interface PublicTabs extends AccomplishmentTabs {
  updateLog?: SheetRows;
  extensions?: SheetRows;
  pictures?: SheetRows;
  coordinates?: SheetRows;
  dates?: SheetRows;
  city?: SheetRows;
  quadrant?: SheetRows;
  sector?: SheetRows;
  length?: SheetRows;
  width?: SheetRows;
  volume?: SheetRows;
  siteEquipment?: SheetRows;
  siteManpower?: SheetRows;
}

interface Located {
  record: AccomplishmentRecord;
  region: string;
  site: string;
}

/** Every record by exact and loose name, with its region code and site. */
function indexRecords(data: AccomplishmentData) {
  const exact = new Map<string, Located>();
  const loose = new Map<string, Located | null>();
  for (const r of data.regions) {
    const region = regionLabel(r).code;
    for (const s of r.s)
      for (const w of s.w) {
        const located = { record: w, region, site: s.n };
        const k = key(w.n);
        if (!exact.has(k)) exact.set(k, located);
        const lk = looseKey(w.n);
        if (lk) loose.set(lk, loose.has(lk) && loose.get(lk) !== located ? null : located);
      }
  }
  return (name: string): Located | null => exact.get(key(name)) ?? (loose.get(looseKey(name)) || null);
}

/** Calls [each] with the record named in each row of a "name of waterway" tab. */
function eachByName(rows: SheetRows | undefined, find: (name: string) => Located | null, each: (located: Located, row: string[], t: ReturnType<typeof table>) => void) {
  if (!rows?.length) return;
  const t = table(rows);
  const name = pick(t.head, ["name of waterway", "waterway"]);
  if (name < 0) return;
  for (const row of t.rows) {
    const raw = val(row, name).trim();
    if (!raw) continue;
    const located = find(raw);
    if (located) each(located, row, t);
  }
}

const extra = (w: AccomplishmentRecord): RecordExtra => (w.x ??= {});
const text = (v: string) => v.replace(/\s+/g, " ").trim();
const positive = (n: number | null) => (n !== null && n > 0 ? n : undefined);

/** Drive file id of a photo link (lh3.googleusercontent.com/d/<id>, drive.google.com/file/d/<id>, ?id=<id>). */
export function driveId(link: string): string | null {
  const m = /\/d\/([\w-]{20,})/.exec(link) ?? /[?&]id=([\w-]{20,})/.exec(link);
  return m?.[1] ?? null;
}

function sumBy(entries: { label: string; qty: number }[]): Quantity[] {
  const totals = new Map<string, number>();
  for (const e of entries) if (e.label && e.qty > 0) totals.set(e.label, (totals.get(e.label) ?? 0) + e.qty);
  return [...totals].map(([label, qty]) => ({ label, qty })).sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label));
}

export function buildPublicAccomplishment(tabs: PublicTabs, generatedAt = new Date()): PublicAccomplishment {
  const data = buildAccomplishment(tabs, generatedAt);
  const find = indexRecords(data);
  const siteRegion = new Map<string, string>();
  for (const r of data.regions) for (const s of r.s) siteRegion.set(key(s.n), regionLabel(r).code);
  const regionOfSite = (site: string) => siteRegion.get(key(site)) ?? "";

  // Details from the "name of waterway" tabs.
  eachByName(tabs.city, find, ({ record }, row, t) => {
    const city = text(val(row, pick(t.head, ["city/municipality", "city", "municipality"])));
    if (city) extra(record).city = city;
  });
  eachByName(tabs.quadrant, find, ({ record }, row, t) => {
    const q = text(val(row, pick(t.head, ["quadrant"]))).toUpperCase();
    if (q && q !== "NONE") extra(record).q = q;
    const city = text(val(row, pick(t.head, ["city/municipality"])));
    if (city && !record.x?.city) extra(record).city = city;
  });
  eachByName(tabs.sector, find, ({ record }, row, t) => {
    const sec = text(val(row, pick(t.head, ["sector"])));
    const secT = text(val(row, pick(t.head, ["sector_type", "sector type"])));
    if (sec) extra(record).sec = sec;
    if (secT) extra(record).secT = secT;
  });
  if (tabs.dates?.length) {
    const t = table(tabs.dates);
    const start = pick(t.head, ["target_start_date", "target start date", "start"]);
    const end = pick(t.head, ["target_end_date", "target end date", "end"]);
    const order = dayOrder(t.rows.flatMap((r) => [val(r, start), val(r, end)]), "mdy");
    eachByName(tabs.dates, find, ({ record }, row, tt) => {
      const ts = isoDay(parseSheetDate(val(row, start), order));
      const te = isoDay(parseSheetDate(val(row, end), order));
      if (ts) extra(record).ts = ts;
      if (te) extra(record).te = te;
      const city = text(val(row, pick(tt.head, ["city/municipality"])));
      if (city && !record.x?.city) extra(record).city = city;
    });
  }
  eachByName(tabs.width, find, ({ record }, row, t) => {
    const wd = positive(num(val(row, pick(t.head, ["width_boe", "width"]))));
    if (wd) extra(record).wd = wd;
  });
  eachByName(tabs.length, find, ({ record }, row, t) => {
    const plo = positive(num(val(row, pick(t.head, ["planned_length_original"]))));
    if (plo) extra(record).plo = Math.round(plo * 10) / 10;
    // WaterwayVsAccomplishment often leaves the lengths blank; this tab has them.
    if (record.pl === null) record.pl = num(val(row, pick(t.head, ["planned_length_office", "planned length office"])));
    if (record.al === null) record.al = num(val(row, pick(t.head, ["accomplished_length", "accomplished length"])));
  });
  eachByName(tabs.volume, find, ({ record }, row, t) => {
    const pvo = positive(num(val(row, pick(t.head, ["planned_volume_original"]))));
    if (pvo) extra(record).pvo = Math.round(pvo);
  });
  if (tabs.siteWaterway?.length) {
    const t = table(tabs.siteWaterway);
    const ext = pick(t.head, ["extensions"]);
    const first = pick(t.head, ["first registered"]);
    const order = dayOrder(t.rows.map((r) => val(r, first)), "dmy");
    eachByName(tabs.siteWaterway, find, ({ record }, row) => {
      const n = positive(num(val(row, ext)));
      if (n) extra(record).ext = n;
      const fr = isoDay(parseSheetDate(val(row, first), order));
      if (fr) extra(record).fr = fr;
    });
  }

  // Field photos, newest first.
  const photos = readPhotos(tabs.pictures, find);
  for (const p of photos) {
    const located = find(p.w);
    if (!located) continue;
    const x = extra(located.record);
    x.ph = (x.ph ?? 0) + 1;
    x.cv ??= p.id; // newest first, so the first one seen is the cover
  }

  // Traced points per waterway.
  const coordinates = { waterways: 0, points: 0, cleaned: 0 };
  if (tabs.coordinates?.length) {
    const t = table(tabs.coordinates);
    const name = pick(t.head, ["name of waterway", "waterway"]);
    const cleaned = pick(t.head, ["cleaned"]);
    const counts = new Map<string, { located: Located | null; c: number; t: number }>();
    for (const row of t.rows) {
      const raw = val(row, name).trim();
      if (!raw) continue;
      const k = key(raw);
      let entry = counts.get(k);
      if (!entry) {
        entry = { located: find(raw), c: 0, t: 0 };
        counts.set(k, entry);
      }
      entry.t++;
      if (/^y/i.test(val(row, cleaned).trim())) entry.c++;
    }
    for (const entry of counts.values()) {
      coordinates.waterways++;
      coordinates.points += entry.t;
      coordinates.cleaned += entry.c;
      if (entry.located) {
        extra(entry.located.record).cp = entry.c;
        extra(entry.located.record).tp = entry.t;
      }
    }
  }

  // Equipment and manpower per site (the area tabs are totals of these).
  const sites = new Map<string, SiteResources>();
  const siteOf = (raw: string) => {
    const k = key(raw);
    let s = sites.get(k);
    if (!s) {
      s = { site: text(raw), region: regionOfSite(raw), equipment: 0, manpower: 0, items: [], crew: [] };
      sites.set(k, s);
    }
    return s;
  };
  const equipmentRows: { type: string; source: string; qty: number }[] = [];
  if (tabs.siteEquipment?.length) {
    const t = table(tabs.siteEquipment);
    const [site, type, source, qty] = [["site"], ["equipment_type", "equipment type"], ["equipment_source", "equipment source"], ["equipment_quantity", "equipment quantity", "quantity"]].map((n) => pick(t.head, n)) as [number, number, number, number];
    for (const row of t.rows) {
      const q = num(val(row, qty)) ?? 0;
      const name = val(row, site).trim();
      if (!name || q <= 0) continue;
      const item = { type: text(val(row, type)).toUpperCase(), source: text(val(row, source)).toUpperCase(), qty: q };
      const s = siteOf(name);
      s.items.push(item);
      s.equipment += q;
      equipmentRows.push(item);
    }
  }
  const crewRows: { source: string; qty: number }[] = [];
  if (tabs.siteManpower?.length) {
    const t = table(tabs.siteManpower);
    const [site, source, qty] = [["site"], ["manpower_source", "manpower source"], ["manpower_quantity", "manpower quantity", "quantity"]].map((n) => pick(t.head, n)) as [number, number, number];
    for (const row of t.rows) {
      const q = num(val(row, qty)) ?? 0;
      const name = val(row, site).trim();
      if (!name || q <= 0) continue;
      const crew = { source: text(val(row, source)).toUpperCase(), qty: q };
      const s = siteOf(name);
      s.crew.push(crew);
      s.manpower += q;
      crewRows.push(crew);
    }
  }
  const siteList = [...sites.values()].sort((a, b) => b.manpower + b.equipment - (a.manpower + a.equipment));
  for (const s of siteList) s.items.sort((a, b) => b.qty - a.qty);

  // Accomplishment Log entries (named columns only — never the confirmation e-mail).
  const updates: FieldUpdate[] = [];
  if (tabs.log?.length) {
    const t = table(tabs.log);
    const c = (names: string[]) => pick(t.head, names);
    const col = {
      at: c(["timestamp", "date"]),
      name: c(["name of waterway", "waterway"]),
      mode: c(["entry_mode", "entry mode"]),
      volume: c(["volume_entered_cu_m", "volume_entered"]),
      previous: c(["previous_total_cu_m", "previous_total"]),
      total: c(["new_total_cu_m", "new_total"]),
      region: c(["region"]),
      site: c(["site"]),
      type: c(["type"]),
      planned: c(["planned_volume_office"]),
      pc: c(["points_cleaned"]),
      pt: c(["points_total"]),
      sc: c(["segments_cleaned"]),
      st: c(["segments_total"]),
    };
    const order = dayOrder(t.rows.map((r) => val(r, col.at)), "dmy");
    t.rows.forEach((row) => {
      const name = text(val(row, col.name));
      if (!name) return;
      const located = find(name);
      const at = parseSheetDate(val(row, col.at), order);
      updates.push({
        at: at === null ? null : new Date(at).toISOString(),
        waterway: located?.record.n ?? name,
        region: located?.region || text(val(row, col.region)),
        site: located?.site || text(val(row, col.site)),
        type: text(val(row, col.type)),
        mode: /to|set|replace/i.test(val(row, col.mode)) ? "to" : "by",
        volume: num(val(row, col.volume)),
        total: num(val(row, col.total)),
        previous: num(val(row, col.previous)),
        planned: num(val(row, col.planned)),
        pointsCleaned: num(val(row, col.pc)),
        pointsTotal: num(val(row, col.pt)),
        segmentsCleaned: num(val(row, col.sc)),
        segmentsTotal: num(val(row, col.st)),
      });
    });
    updates.reverse().sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  }

  // Traced-line extensions (named columns only — never the submitter e-mail).
  const extensions: LineExtension[] = [];
  if (tabs.extensions?.length) {
    const t = table(tabs.extensions);
    const c = (names: string[]) => pick(t.head, names);
    const col = {
      at: c(["submitted", "exported"]),
      region: c(["submitting region", "region"]),
      site: c(["site"]),
      name: c(["name of waterway"]),
      no: c(["extension no"]),
      points: c(["points added"]),
      segments: c(["segments added"]),
    };
    const order = dayOrder(t.rows.map((r) => val(r, col.at)), "dmy");
    for (const row of t.rows) {
      const name = text(val(row, col.name));
      if (!name) continue;
      const located = find(name);
      const at = parseSheetDate(val(row, col.at), order);
      extensions.push({
        at: at === null ? null : new Date(at).toISOString(),
        region: located?.region || text(val(row, col.region)),
        site: located?.site || text(val(row, col.site)),
        waterway: located?.record.n ?? name,
        no: num(val(row, col.no)),
        points: num(val(row, col.points)),
        segments: num(val(row, col.segments)),
      });
    }
    extensions.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  }

  // Last report day per site.
  const siteReports: PublicAccomplishment["siteReports"] = [];
  if (tabs.updateLog?.length) {
    const t = table(tabs.updateLog);
    const site = pick(t.head, ["site"]);
    const date = pick(t.head, ["date_of_update", "date of update", "date"]);
    const order = dayOrder(t.rows.map((r) => val(r, date)), "mdy");
    for (const row of t.rows) {
      const name = text(val(row, site));
      if (!name) continue;
      siteReports.push({ site: name, region: regionOfSite(name), date: isoDay(parseSheetDate(val(row, date), order)) });
    }
    siteReports.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.site.localeCompare(b.site));
  }

  const photoDays = photos.map((p) => p.d).filter((d): d is string => Boolean(d)).sort();
  return {
    ...data,
    siteReports,
    resources: {
      equipment: equipmentRows.reduce((n, e) => n + e.qty, 0),
      manpower: crewRows.reduce((n, e) => n + e.qty, 0),
      equipmentByType: sumBy(equipmentRows.map((e) => ({ label: e.type, qty: e.qty }))),
      equipmentBySource: sumBy(equipmentRows.map((e) => ({ label: e.source, qty: e.qty }))),
      manpowerBySource: sumBy(crewRows.map((e) => ({ label: e.source, qty: e.qty }))),
      sites: siteList,
    },
    updates: updates.slice(0, 100),
    extensions: extensions.slice(0, 100),
    photos: {
      total: photos.length,
      waterways: new Set(photos.map((p) => key(p.w))).size,
      first: photoDays[0] ?? null,
      last: photoDays[photoDays.length - 1] ?? null,
      latest: photos.slice(0, 24),
    },
    coordinates,
  };
}

/** The photo tab's rows as photos (one per Drive file), newest first; same-day photos newest row first. */
function readPhotos(rows: SheetRows | undefined, find: (name: string) => Located | null): FieldPhoto[] {
  if (!rows?.length) return [];
  const t = table(rows);
  const name = pick(t.head, ["name of waterway", "waterway"]);
  const link = pick(t.head, ["link"]);
  const date = pick(t.head, ["date"]);
  const seen = new Set<string>();
  const out: FieldPhoto[] = [];
  for (const row of t.rows) {
    const raw = text(val(row, name));
    const id = driveId(val(row, link));
    if (!raw || !id || seen.has(id)) continue;
    seen.add(id);
    const located = find(raw);
    out.push({ id, w: located?.record.n ?? raw, r: located?.region ?? "", s: located?.site ?? "", d: isoDay(parseSheetDate(val(row, date), "mdy")) });
  }
  return out.reverse().sort((a, b) => (b.d ?? "").localeCompare(a.d ?? ""));
}

/** Every field photo, newest first (for the gallery). */
export function buildFieldPhotos(tabs: PublicTabs): FieldPhoto[] {
  return readPhotos(tabs.pictures, indexRecords(buildAccomplishment(tabs)));
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Each waterway's traced line as runs of cleaned and remaining stretches, thinned to at most ~50 points per
 * run (run ends always kept) so the whole country fits in one small response.
 */
export function buildMapLines(tabs: PublicTabs): MapLine[] {
  if (!tabs.coordinates?.length) return [];
  const data = buildAccomplishment(tabs);
  const find = indexRecords(data);
  const t = table(tabs.coordinates);
  const name = pick(t.head, ["name of waterway", "waterway"]);
  const lat = pick(t.head, ["latitude", "lat"]);
  const lng = pick(t.head, ["longitude", "lng", "lon"]);
  const segment = pick(t.head, ["segment"]);
  const sequence = pick(t.head, ["sequence"]);
  const cleaned = pick(t.head, ["cleaned"]);

  type Pt = { seq: number; idx: number; lng: number; lat: number; c: number };
  const lines = new Map<string, { raw: string; segments: Map<string, Pt[]> }>();
  t.rows.forEach((row, idx) => {
    const raw = val(row, name).trim();
    const y = num(val(row, lat));
    const x = num(val(row, lng));
    if (!raw || y === null || x === null || Math.abs(y) > 90 || Math.abs(x) > 180 || (y === 0 && x === 0)) return;
    const k = key(raw);
    let line = lines.get(k);
    if (!line) {
      line = { raw, segments: new Map() };
      lines.set(k, line);
    }
    const seg = val(row, segment).trim() || "1";
    let pts = line.segments.get(seg);
    if (!pts) {
      pts = [];
      line.segments.set(seg, pts);
    }
    pts.push({ seq: num(val(row, sequence)) ?? idx, idx, lng: x, lat: y, c: /^y/i.test(val(row, cleaned).trim()) ? 1 : 0 });
  });

  const out: MapLine[] = [];
  for (const line of lines.values()) {
    const located = find(line.raw);
    const runs: number[][] = [];
    for (const pts of line.segments.values()) {
      pts.sort((a, b) => a.seq - b.seq || a.idx - b.idx);
      let run: Pt[] = [];
      const flush = (next?: Pt) => {
        if (run.length) {
          // A run shares its last point with the next so the line has no gaps.
          const all = next ? [...run, next] : run;
          const step = Math.max(1, Math.ceil(all.length / 50));
          const kept = all.filter((_, i) => i % step === 0 || i === all.length - 1);
          if (kept.length >= 2 || (kept.length === 1 && !next)) {
            runs.push([run[0]!.c, ...kept.flatMap((p) => [round5(p.lng), round5(p.lat)])]);
          }
        }
        run = next ? [next] : [];
      };
      for (const p of pts) {
        if (run.length && p.c !== run[0]!.c) flush(p);
        else run.push(p);
      }
      flush();
    }
    if (runs.length) {
      out.push({
        w: located?.record.n ?? line.raw,
        r: located?.region ?? "",
        s: located?.site ?? "",
        g: located ? recordPct(located.record, data.scale) : null,
        runs,
      });
    }
  }
  return out;
}
