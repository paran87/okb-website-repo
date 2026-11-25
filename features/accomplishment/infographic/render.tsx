/* eslint-disable @next/next/no-img-element -- this markup is drawn into a PNG by next/og, not served as a page */
import "server-only";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { InfographicAssets } from "@/features/accomplishment/infographic/assets";
import { compact, int, km, manilaDate, manilaTime, pct, shortDay } from "@/features/accomplishment/infographic/format";
import type { Highlights } from "@/features/accomplishment/infographic/highlights";
import { ICONS, type IconName } from "@/features/accomplishment/infographic/icons";
import { PH_MAP, PH_PATH, projectPh } from "@/features/accomplishment/infographic/ph-map";
import { REGION_POINTS } from "@/features/accomplishment/infographic/region-points";
import type { InfographicRow, InfographicSummary } from "@/features/accomplishment/infographic/summary";
import type { WorkStatus } from "@/features/accomplishment/lib/rollup";

/**
 * The accomplishment infographic as a 1080 px wide PNG (portrait, the size Facebook and Viber show in full).
 * Laid out for the image renderer (next/og): flex boxes only, fonts and pictures passed in.
 */

export const WIDTH = 1080;
const PAD = 56;
const INNER = WIDTH - PAD * 2;

const C = {
  navy: "#002855",
  navyDeep: "#001a3a",
  blue: "#0038a8",
  orange: "#f57e20",
  orangeDark: "#d96a12",
  gold: "#fcd116",
  page: "#eef2f7",
  card: "#ffffff",
  text: "#14213d",
  muted: "#5a6578",
  line: "#dfe5ee",
  track: "#e5eaf1",
};

const STATUS: Record<WorkStatus, { label: string; color: string }> = {
  done: { label: "Completed", color: "#16a34a" },
  ongoing: { label: "Ongoing", color: "#0284c7" },
  pending: { label: "Not started", color: "#d97706" },
  none: { label: "No report yet", color: "#94a3b8" },
};
const STATUS_ORDER: WorkStatus[] = ["done", "ongoing", "pending", "none"];

const DISPLAY = "Barlow Condensed";
const SANS = "Source Sans 3";

export interface InfographicPhoto {
  src: string;
  name: string;
  place: string;
  day: string | null;
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Progress colour: orange at 0%, gold at 50%, green at 100%. */
function progressColor(p: number | null): string {
  if (p === null) return "#94a3b8";
  const t = clamp01(p / 100);
  const stops: [number, [number, number, number]][] = [
    [0, [245, 126, 32]],
    [0.5, [252, 209, 22]],
    [1, [34, 197, 94]],
  ];
  const i = t <= 0.5 ? 0 : 1;
  const [a, ca] = stops[i]!;
  const [b, cb] = stops[i + 1]!;
  const f = (t - a) / (b - a);
  const mix = ca.map((v, k) => Math.round(v + (cb[k]! - v) * f));
  return `rgb(${mix.join(",")})`;
}

function Icon({ name, size = 28, color = "#fff", stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return <Tag key={i} {...(attrs as Record<string, string>)} />;
      })}
    </svg>
  );
}

function Bar({ value, width, height, color, track = C.track }: { value: number | null; width: number; height: number; color: string; track?: string }) {
  const w = value === null ? 0 : Math.round(width * clamp01(value / 100));
  return (
    <div style={{ display: "flex", width, height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      {w > 0 ? <div style={{ display: "flex", width: Math.max(w, height), height, borderRadius: height, backgroundColor: color }} /> : null}
    </div>
  );
}

function SectionTitle({ icon, children, note }: { icon: IconName; children: ReactNode; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", width: 46, height: 46, borderRadius: 23, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={24} color={C.gold} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, letterSpacing: 1.5, color: C.navy, textTransform: "uppercase" }}>{children}</div>
      </div>
      {note ? <div style={{ fontFamily: SANS, fontSize: 18, color: C.muted }}>{note}</div> : null}
    </div>
  );
}

function Card({ children, padding = 36, style }: { children: ReactNode; padding?: number; style?: Record<string, string | number> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.card,
        borderRadius: 30,
        padding,
        boxShadow: "0 10px 30px rgba(0, 40, 85, 0.10)",
        border: `1px solid ${C.line}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Lines a text of [chars] characters takes in a box [width] px wide at [size] px (generous). */
const lines = (chars: number, width: number, size: number, factor: number) => Math.max(1, Math.ceil((chars * size * factor) / width));

// ---------------------------------------------------------------------------------------------------------------
// Sections. Each returns its node and its height, so the image is exactly as tall as its content.

function header(s: InfographicSummary, a: InfographicAssets) {
  const H = 360;
  const chip = (text: string, tone: "gold" | "glass") => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 44,
        padding: "0 20px",
        borderRadius: 22,
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 20,
        color: tone === "gold" ? C.navy : "#fff",
        backgroundColor: tone === "gold" ? C.gold : "rgba(255,255,255,0.14)",
        border: tone === "gold" ? "none" : "1px solid rgba(255,255,255,0.28)",
      }}
    >
      {text}
    </div>
  );
  return {
    h: H,
    node: (
      <div style={{ display: "flex", position: "relative", width: WIDTH, height: H, flexDirection: "column" }}>
        <img src={a.hero} width={WIDTH} height={H} style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: H, objectFit: "cover" }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: H,
            backgroundImage: "linear-gradient(180deg, rgba(0,26,58,0.62) 0%, rgba(0,40,85,0.90) 58%, rgba(0,40,85,1) 100%)",
          }}
        />
        <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, width: WIDTH, height: 10, backgroundImage: `linear-gradient(90deg, ${C.orange}, ${C.gold})` }} />
        <div style={{ display: "flex", flexDirection: "column", padding: `40px ${PAD}px 0`, width: WIDTH }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <img src={a.okbLogo} width={93} height={106} style={{ width: 93, height: 106 }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, lineHeight: 1, color: "#fff", letterSpacing: 1 }}>OPLAN KONTRA BAHA</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: C.gold, marginTop: 6 }}>FLOOD CONTROL AND DISASTER RESILIENCE · PHILIPPINES</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={a.dpwhLogo} width={78} height={78} style={{ width: 78, height: 78 }} />
              <img src={a.bpLogo} width={84} height={78} style={{ width: 84, height: 78 }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 24, letterSpacing: 5, color: "rgba(255,255,255,0.75)" }}>ACCOMPLISHMENT REPORT</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, lineHeight: 1.05, color: "#fff" }}>
                {cut(s.scope.typesLabel === "Waterways" ? "Dredging and desilting" : s.scope.typesLabel === "Drainage" ? "Drainage declogging" : "Dredging, desilting and declogging", 40)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
            {chip(s.scope.typesLabel, "gold")}
            {chip(cut(s.scope.regionsLabel, 40), "glass")}
            {chip(`As of ${manilaDate(s.asOf)} · ${manilaTime(s.asOf)}`, "glass")}
          </div>
        </div>
      </div>
    ),
  };
}

function highlightsCard(s: InfographicSummary, hl: Highlights) {
  const RING = 270;
  const textW = INNER - 72 - RING - 48;
  const headLines = lines(hl.headline.length, textW, 46, 0.46);
  const pointLines = hl.points.map((p) => lines(p.length, textW - 52, 25, 0.47));
  const textH = 34 + 14 + headLines * 50 + 22 + pointLines.reduce((n, l) => n + l * 33 + 18, 0);
  const h = Math.max(RING + 30, textH) + 72;
  const r = 112;
  const circ = 2 * Math.PI * r;
  const done = clamp01((s.overall ?? 0) / 100);
  return {
    h,
    node: (
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 48, height: h }}>
        <div style={{ display: "flex", position: "relative", width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
          <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} style={{ position: "absolute", top: 0, left: 0 }}>
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={C.gold} />
                <stop offset="100%" stopColor={C.orange} />
              </linearGradient>
            </defs>
            <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={C.track} strokeWidth={30} />
            {done > 0 ? (
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                fill="none"
                stroke="url(#ring)"
                strokeWidth={30}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(circ * done, 1)} ${circ}`}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            ) : null}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 1, color: C.navy }}>{pct(s.overall)}</div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: C.muted, marginTop: 4 }}>
              {s.scope.mode === "wtd" ? "BY VOLUME" : "AVERAGE PROGRESS"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: textW }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 34 }}>
            <Icon name="sparkles" size={24} color={C.orange} />
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 19, letterSpacing: 3, color: C.orangeDark }}>HIGHLIGHTS</div>
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, lineHeight: 1.08, color: C.navy, marginTop: 14 }}>{hl.headline}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}>
            {hl.points.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: C.orange,
                    color: "#fff",
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 22,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {String(i + 1)}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 25, lineHeight: 1.3, color: C.text, width: textW - 52 }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    ),
  };
}

function tiles(s: InfographicSummary) {
  // Four figures, two by two.
  const W = (INNER - 22) / 2;
  const H = 232;
  const drainageOnly = s.scope.types.length === 1 && s.scope.types[0] === "drainage";
  const list: { icon: IconName; color: string; label: string; value: string; unit?: string; sub: string; bar?: number | null }[] = [
    {
      icon: "shovel",
      color: C.orange,
      label: drainageOnly ? "Silt declogged" : "Silt removed",
      value: compact(s.volume.acc),
      unit: "m³",
      sub: s.volume.plan > 0 ? `of ${compact(s.volume.plan)} m³ planned` : "volume reported",
      bar: s.volume.plan > 0 ? (100 * s.volume.acc) / s.volume.plan : null,
    },
    {
      icon: "check",
      color: STATUS.done.color,
      label: "Completed",
      value: int(s.status.done),
      unit: `/ ${int(s.records)}`,
      sub: `${int(s.status.ongoing)} ongoing`,
      bar: s.records ? (100 * s.status.done) / s.records : null,
    },
    s.length.done > 0 || s.length.plan > 0
      ? {
          icon: "ruler",
          color: C.blue,
          label: "Length cleaned",
          value: km(s.length.done).replace(/ (k?m)$/, ""),
          unit: km(s.length.done).endsWith("km") ? "km" : "m",
          sub: s.length.plan > 0 ? `of ${km(s.length.plan)} planned` : "length reported",
          bar: s.length.plan > 0 ? (100 * s.length.done) / s.length.plan : null,
        }
      : {
          icon: "map",
          color: C.blue,
          label: "Points cleaned",
          value: compact(s.points.cleaned),
          unit: `/ ${compact(s.points.total)}`,
          sub: "traced points on the map",
          bar: s.points.total > 0 ? (100 * s.points.cleaned) / s.points.total : null,
        },
    { icon: "pin", color: "#7c3aed", label: "Sites", value: int(s.sites), sub: `${int(s.regions)} ${s.regions === 1 ? "region" : "regions"} · ${int(s.records)} ${s.scope.recordsWord}` },
  ];
  return {
    h: H * 2 + 22,
    node: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, width: INNER }}>
        {list.map((t) => (
          <div
            key={t.label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: W,
              height: H,
              padding: "24px 26px",
              backgroundColor: C.card,
              borderRadius: 26,
              border: `1px solid ${C.line}`,
              borderTop: `8px solid ${t.color}`,
              boxShadow: "0 8px 24px rgba(0, 40, 85, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 44, height: 44, borderRadius: 22, backgroundColor: t.color, alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={24} />
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, letterSpacing: 2.5, color: C.muted, textTransform: "uppercase" }}>{t.label}</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 14 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 60, lineHeight: 1, color: C.navy }}>{t.value}</div>
              {t.unit ? <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: C.muted, marginLeft: 8 }}>{t.unit}</div> : null}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: C.muted, marginTop: 8 }}>{cut(t.sub, 34)}</div>
            {t.bar !== undefined ? (
              <div style={{ display: "flex", marginTop: 14 }}>
                <Bar value={t.bar} width={W - 52} height={10} color={t.color} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    ),
  };
}

/** What each status means, under its count. */
const STATUS_HINT: Record<WorkStatus, string> = {
  done: "Reported complete, or 100% of the plan",
  ongoing: "Work started, figures coming in",
  pending: "Planned, work not started yet",
  none: "No figures reported yet",
};

function statusCard(s: InfographicSummary) {
  const total = s.records || 1;
  const BAR_W = INNER - 72;
  const shown = STATUS_ORDER.filter((k) => s.status[k] > 0);
  const drainageOnly = s.scope.types.length === 1 && s.scope.types[0] === "drainage";
  // What is left: silt and length still to go against the plan, and records without a start or a first report.
  const left: { icon: IconName; value: string; label: string }[] = [];
  if (s.volume.plan > s.volume.acc) left.push({ icon: "shovel", value: `${compact(s.volume.plan - s.volume.acc)} m³`, label: drainageOnly ? "silt still to declog" : "silt still to remove" });
  if (s.length.plan > s.length.done) left.push({ icon: "ruler", value: km(s.length.plan - s.length.done), label: "length still to clean" });
  if (s.status.pending + s.status.none > 0) left.push({ icon: "calendar", value: int(s.status.pending + s.status.none), label: "not started or not reported" });
  const BOX_H = 156;
  const LEFT_H = left.length ? 30 + 84 : 0;
  const h = 72 + 68 + 44 + 30 + BOX_H + LEFT_H;
  const LW = left.length ? (BAR_W - 18 * (left.length - 1)) / left.length : 0;
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="list" note={`${int(s.records)} ${s.scope.recordsWord}`}>
          Status of records
        </SectionTitle>
        <div style={{ display: "flex", width: BAR_W, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: C.track }}>
          {shown.map((k) => {
            const w = Math.max(6, Math.round((BAR_W * s.status[k]) / total));
            return (
              <div
                key={k}
                style={{
                  display: "flex",
                  width: w,
                  height: 44,
                  backgroundColor: STATUS[k].color,
                  borderRight: "3px solid #fff",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#fff",
                }}
              >
                {w > 70 ? pct((100 * s.status[k]) / total) : ""}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
          {STATUS_ORDER.map((k) => (
            <div
              key={k}
              style={{ display: "flex", flexDirection: "column", width: (BAR_W - 3 * 18) / 4, height: BOX_H, padding: "14px 18px", borderRadius: 18, backgroundColor: "#f6f8fb", border: `1px solid ${C.line}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, backgroundColor: STATUS[k].color }} />
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, color: STATUS[k].color }}>{STATUS[k].label}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, lineHeight: 1.05, color: C.navy }}>{int(s.status[k])}</div>
                <div style={{ fontFamily: SANS, fontSize: 18, color: C.muted }}>{pct((100 * s.status[k]) / total)}</div>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.25, color: C.muted, marginTop: 6 }}>{STATUS_HINT[k]}</div>
            </div>
          ))}
        </div>
        {left.length ? (
          <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
            {left.map((l) => (
              <div
                key={l.label}
                style={{ display: "flex", alignItems: "center", gap: 14, width: LW, height: 84, padding: "0 18px", borderRadius: 18, backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}
              >
                <div style={{ display: "flex", width: 42, height: 42, borderRadius: 21, backgroundColor: C.orangeDark, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={l.icon} size={22} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, letterSpacing: 2, color: C.orangeDark }}>STILL TO DO</div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, lineHeight: 1.05, color: C.navy }}>{l.value}</div>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: C.muted }}>{cut(l.label, 30)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    ),
  };
}

const LABEL_H = 26;
/** Barlow Condensed 700 at 19 px: about 8.6 px a character, plus the padding. */
const labelWidth = (text: string) => Math.round(text.length * 8.6 + 16);

/**
 * Places each region label next to its circle where it covers no other label or circle: tries the right, left,
 * top and bottom and the corners, a little further out each round; the least crowded spot when none is free.
 */
function placeLabels(items: { key: string; x: number; y: number; r: number; text: string }[], w: number, h: number) {
  type Box = { l: number; t: number; r: number; b: number };
  const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const circles: Box[] = items.map((c) => ({ l: c.x - c.r, t: c.y - c.r, r: c.x + c.r, b: c.y + c.r }));
  const placed: Box[] = [];
  const out: { key: string; text: string; left: number; top: number; line: [number, number, number, number] | null }[] = [];
  for (const it of [...items].sort((a, b) => b.r - a.r)) {
    const lw = labelWidth(it.text);
    let best: { box: Box; cost: number } | null = null;
    for (const gap of [5, 16, 30]) {
      const d = it.r + gap;
      const spots: [number, number][] = [
        [it.x + d, it.y - LABEL_H / 2],
        [it.x - d - lw, it.y - LABEL_H / 2],
        [it.x - lw / 2, it.y - d - LABEL_H],
        [it.x - lw / 2, it.y + d],
        [it.x + d * 0.7, it.y - d * 0.7 - LABEL_H],
        [it.x + d * 0.7, it.y + d * 0.7],
        [it.x - d * 0.7 - lw, it.y - d * 0.7 - LABEL_H],
        [it.x - d * 0.7 - lw, it.y + d * 0.7],
      ];
      for (const [l0, t0] of spots) {
        const l = Math.max(4, Math.min(w - lw - 4, l0));
        const t = Math.max(4, Math.min(h - LABEL_H - 4, t0));
        const box = { l, t, r: l + lw, b: t + LABEL_H };
        const cost =
          placed.reduce((n, p) => n + overlap(box, p) * 4, 0) + circles.reduce((n, c) => n + overlap(box, c), 0) + (l !== l0 || t !== t0 ? 40 : 0) + gap;
        if (!best || cost < best.cost) best = { box, cost };
      }
      if (best && best.cost <= gap) break;
    }
    const box = best!.box;
    placed.push(box);
    // A label set away from its circle gets a leader line from the circle's edge to the label's nearest point.
    const nx = Math.max(box.l, Math.min(box.r, it.x));
    const ny = Math.max(box.t, Math.min(box.b, it.y));
    const dist = Math.hypot(nx - it.x, ny - it.y);
    const line: [number, number, number, number] | null =
      dist > it.r + 3 ? [it.x + ((nx - it.x) / dist) * it.r, it.y + ((ny - it.y) / dist) * it.r, nx, ny] : null;
    out.push({ key: it.key, text: it.text, left: Math.round(box.l), top: Math.round(box.t), line });
  }
  return out;
}

function mapAndRows(s: InfographicSummary) {
  const MAP_W = 400;
  const k = MAP_W / PH_MAP.width;
  const MAP_H = Math.round(PH_MAP.height * k);
  const byRegion = s.rowsKind === "region";
  const ROW_H = byRegion ? 37 : 40;
  const nameW = byRegion ? 128 : 196;
  // The region under each site / city / record, unless they are all in the same one.
  const showSub = !byRegion && new Set(s.rows.map((r) => r.sub)).size > 1;
  const rowsW = INNER - 72 - MAP_W - 44;
  // The rows, "+ N more", and the "How progress is counted" box under them.
  const listH = s.rows.length * ROW_H + (s.rowsMore ? 34 : 0) + 140;
  const bodyH = Math.max(MAP_H + 44, listH);
  const h = bodyH + 72 + 68;
  const maxRecords = Math.max(1, ...s.map.map((m) => m.records));
  const dots = s.map
    .map((m) => {
      const at = REGION_POINTS[m.token];
      if (!at) return null;
      const [x, y] = projectPh(at[0], at[1]);
      const r = m.inScope ? 11 + 19 * Math.sqrt(m.records / maxRecords) : 8;
      return { ...m, x: x * k, y: y * k, r };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => Number(a.inScope) - Number(b.inScope) || b.r - a.r);
  const label = (code: string) => code.replace(/^Region /, "");
  const labels = placeLabels(
    dots.filter((d) => d.inScope).map((d) => ({ key: d.code, x: d.x, y: d.y, r: d.r, text: `${label(d.code)} ${pct(d.pct)}` })),
    MAP_W,
    MAP_H,
  );
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="gauge" note={s.rowsKind === "region" ? "best progress first" : `${cut(s.scope.regionsLabel, 30)} · best first`}>
          {`Progress by ${s.rowsKind}`}
        </SectionTitle>
        <div style={{ display: "flex", gap: 44 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                position: "relative",
                width: MAP_W,
                height: MAP_H,
                borderRadius: 24,
                backgroundImage: `radial-gradient(circle at 30% 20%, #0a3d8f 0%, ${C.navy} 55%, ${C.navyDeep} 100%)`,
                overflow: "hidden",
              }}
            >
              <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${PH_MAP.width} ${PH_MAP.height}`} style={{ position: "absolute", top: 0, left: 0 }}>
                <path d={PH_PATH} fill="#1d4f9c" stroke="#5b8bd6" strokeWidth={0.8} />
              </svg>
              <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ position: "absolute", top: 0, left: 0 }}>
                {labels.flatMap((l) =>
                  l.line ? [<path key={`k${l.key}`} d={`M${l.line[0].toFixed(1)} ${l.line[1].toFixed(1)}L${l.line[2].toFixed(1)} ${l.line[3].toFixed(1)}`} stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1.6} fill="none" />] : [],
                )}
                {dots.map((d) => (
                  <circle key={`h${d.code}`} cx={d.x} cy={d.y} r={d.r + 6} fill={d.inScope ? progressColor(d.pct) : "#ffffff"} opacity={d.inScope ? 0.28 : 0} />
                ))}
                {dots.map((d) => (
                  <circle
                    key={d.code}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill={d.inScope ? progressColor(d.pct) : "rgba(255,255,255,0.35)"}
                    stroke="#ffffff"
                    strokeWidth={d.inScope ? 2.5 : 1}
                  />
                ))}
              </svg>
              {labels.map((l) => (
                <div
                  key={`l${l.key}`}
                  style={{
                    display: "flex",
                    position: "absolute",
                    left: l.left,
                    top: l.top,
                    width: labelWidth(l.text),
                    height: LABEL_H,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    backgroundColor: "rgba(0,26,58,0.78)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 19,
                    color: "#fff",
                  }}
                >
                  {l.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, fontFamily: SANS, fontSize: 17, color: C.muted }}>
              <div style={{ display: "flex", width: 120, height: 12, borderRadius: 6, backgroundImage: `linear-gradient(90deg, ${progressColor(0)}, ${progressColor(50)}, ${progressColor(100)})` }} />
              <div>0 → 100% · circle size = number of records</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: rowsW }}>
            {s.rows.map((r, i) => (
              <div key={`${r.label}-${i}`} style={{ display: "flex", alignItems: "center", height: ROW_H, gap: 10 }}>
                <div style={{ display: "flex", width: 24, justifyContent: "flex-end", fontFamily: SANS, fontWeight: 700, fontSize: 16, color: C.muted }}>{String(i + 1)}</div>
                <div style={{ display: "flex", flexDirection: "column", width: nameW }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: byRegion ? 23 : 20, lineHeight: 1, color: C.navy }}>
                    {cut(byRegion ? r.label.toUpperCase() : r.label, byRegion ? 14 : 21)}
                  </div>
                  {showSub ? <div style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.1, color: C.muted, marginTop: 1 }}>{cut(r.sub, 30)}</div> : null}
                </div>
                <Bar value={r.pct} width={rowsW - nameW - 24 - 84 - 30} height={14} color={progressColor(r.pct)} />
                <div style={{ display: "flex", width: 84, justifyContent: "flex-end", fontFamily: DISPLAY, fontWeight: 700, fontSize: 25, color: C.navy }}>{pct(r.pct)}</div>
              </div>
            ))}
            {s.rowsMore ? (
              <div style={{ fontFamily: SANS, fontSize: 18, color: C.muted, marginTop: 10, marginLeft: 34 }}>{`+ ${int(s.rowsMore)} more ${s.rowsKind === "city" ? "cities" : `${s.rowsKind}s`}`}</div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24, padding: "18px 20px", borderRadius: 18, backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 17, letterSpacing: 2, color: C.orangeDark }}>HOW PROGRESS IS COUNTED</div>
              <div style={{ fontFamily: SANS, fontSize: 18, lineHeight: 1.35, color: C.text, marginTop: 4 }}>
                {s.scope.mode === "wtd"
                  ? "Each record counts by its planned volume, so larger works weigh more."
                  : "Every record counts the same; a record without a report counts as 0%."}
              </div>
            </div>
          </div>
        </div>
      </Card>
    ),
  };
}

/** A ring with the percent in the middle. */
function Ring({ value, size, stroke, children }: { value: number | null; size: number; stroke: number; children: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const done = clamp01((value ?? 0) / 100);
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
        {done > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={progressColor(value)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(circ * done, 1)} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      {children}
    </div>
  );
}

const TYPE_ICON: Record<string, IconName> = { waterway: "waves", drainage: "droplets", isf: "home" };

/** Each selected record type on its own (only when more than one is selected). */
function byTypeCard(s: InfographicSummary) {
  if (s.byType.length < 2) return null;
  const GAP = 24;
  const W = Math.floor((INNER - 72 - GAP * (s.byType.length - 1)) / s.byType.length);
  const RING = 124;
  const h = 72 + 68 + RING;
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="gauge" note={s.scope.mode === "wtd" ? "by planned volume" : "average progress"}>
          Progress by record type
        </SectionTitle>
        <div style={{ display: "flex", gap: GAP }}>
          {s.byType.map((t) => (
            <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 18, width: W }}>
              <Ring value={t.pct} size={RING} stroke={16}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: C.navy }}>{pct(t.pct)}</div>
              </Ring>
              <div style={{ display: "flex", flexDirection: "column", width: W - RING - 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={TYPE_ICON[t.type] ?? "waves"} size={24} color={C.blue} />
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, color: C.navy }}>{t.label}</div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 19, color: C.text, marginTop: 4 }}>{`${int(t.done)} of ${int(t.records)} completed`}</div>
                <div style={{ fontFamily: SANS, fontSize: 17, color: C.muted }}>{t.volume > 0 ? `${compact(t.volume)} m³ removed` : "no volume reported"}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    ),
  };
}

const signed = (n: number, f: (n: number) => string) => `${n < 0 ? "−" : "+"}${f(Math.abs(n))}`;

/** Silt reported over time (nightly History snapshots) and the last 7 days' changes. */
function trendCard(s: InfographicSummary) {
  const hist = s.history;
  if (!hist) return null;
  const SIDE = 300;
  const CW = INNER - 72 - SIDE - 40;
  const CH = 250;
  const base = hist.series[0]!.acc;
  const vals = hist.series.map((p) => p.acc - base);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(1, ...vals);
  // 12 px inside the edges, so the end dot is not cut off.
  const x = (i: number) => 12 + (i / (hist.series.length - 1)) * (CW - 24);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (CH - 16);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(vals.length - 1).toFixed(1)} ${y(lo).toFixed(1)}L${x(0).toFixed(1)} ${y(lo).toFixed(1)}Z`;
  const sinceText = shortDay(hist.since);
  const week = hist.week;
  const listRows = Math.max(week.gains.length, week.completed.length, 1);
  const weekH = week.updated ? 70 + listRows * 58 + 28 : 92;
  const h = 72 + 68 + CH + 34 + 28 + weekH;
  const callouts: { icon: IconName; color: string; value: string; label: string }[] = [
    { icon: "shovel", color: C.orange, value: `${signed(hist.gain.volume, compact)} m³`, label: `silt reported since ${sinceText}` },
    { icon: "check", color: STATUS.done.color, value: signed(hist.gain.done, int), label: `completed since ${sinceText}` },
    // Length rarely changes night to night; when it has not, the records with new figures this week say more.
    Math.abs(hist.gain.length) >= 1
      ? { icon: "ruler", color: C.blue, value: signed(hist.gain.length, km), label: `length cleaned since ${sinceText}` }
      : { icon: "activity", color: C.blue, value: int(week.updated), label: `${week.updated === 1 ? "record" : "records"} updated, last 7 days` },
  ];
  const item = (name: string, place: string, right: string | null, key: string) => (
    <div key={key} style={{ display: "flex", alignItems: "center", height: 58, gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, width: 10 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 19, color: C.text }}>{cut(name, right ? 26 : 34)}</div>
        <div style={{ fontFamily: SANS, fontSize: 15, color: C.muted }}>{cut(place, 36)}</div>
      </div>
      {right ? <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: C.orangeDark }}>{right}</div> : null}
    </div>
  );
  const colW = (INNER - 72 - 48 - 32) / 2;
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="trend" note={`nightly figures since ${sinceText}`}>
          Progress over time
        </SectionTitle>
        <div style={{ display: "flex", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", width: CW }}>
            <div style={{ display: "flex", position: "relative", width: CW, height: CH }}>
              <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: "absolute", top: 0, left: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.orange} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={C.orange} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((f) => (
                  <path key={f} d={`M0 ${(8 + f * (CH - 16)).toFixed(1)}L${CW} ${(8 + f * (CH - 16)).toFixed(1)}`} stroke={C.line} strokeWidth={1} strokeDasharray="4 6" />
                ))}
                <path d={area} fill="url(#trendFill)" />
                <path d={line} fill="none" stroke={C.orange} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1]!)} r={8} fill="#fff" stroke={C.orange} strokeWidth={4} />
              </svg>
              <div style={{ display: "flex", position: "absolute", left: 8, top: 0, fontFamily: SANS, fontWeight: 700, fontSize: 16, color: C.muted }}>{`${signed(hi, compact)} m³`}</div>
              <div style={{ display: "flex", position: "absolute", left: 8, top: y(lo) - 24, fontFamily: SANS, fontWeight: 700, fontSize: 16, color: C.muted }}>
                {lo < 0 ? `${signed(lo, compact)} m³` : "0"}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: SANS, fontSize: 16, color: C.muted }}>
              <div>{sinceText}</div>
              <div>Today</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: SIDE }}>
            {callouts.map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 18, backgroundColor: "#f6f8fb", border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", width: 44, height: 44, borderRadius: 22, backgroundColor: c.color, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={c.icon} size={22} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1, color: C.navy }}>{c.value}</div>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: C.muted, marginTop: 2 }}>{cut(c.label, 36)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28, padding: "20px 24px", borderRadius: 22, backgroundColor: "#fff7ed", border: "1px solid #fed7aa", height: weekH }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 32 }}>
            <Icon name="calendar" size={22} color={C.orangeDark} />
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, letterSpacing: 2.5, color: C.orangeDark }}>LAST 7 DAYS</div>
            <div style={{ fontFamily: SANS, fontSize: 18, color: C.text, marginLeft: 8 }}>
              {week.updated
                ? `${int(week.updated)} ${week.updated === 1 ? "record" : "records"} with new figures${week.volume > 0.5 ? ` · ${signed(week.volume, compact)} m³` : ""}`
                : "No new figures this week"}
            </div>
          </div>
          {week.updated ? (
            <div style={{ display: "flex", gap: 32, marginTop: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", width: colW }}>
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 15, letterSpacing: 2, color: C.muted }}>BIGGEST GAINS</div>
                {week.gains.length
                  ? week.gains.map((g) => item(g.name, g.place, `${signed(g.volume, compact)} m³`, `g${g.name}`))
                  : [item("No added volume", "figures other than volume changed", null, "g-none")]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", width: colW }}>
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 15, letterSpacing: 2, color: C.muted }}>NEWLY COMPLETED</div>
                {week.completed.length ? week.completed.map((c) => item(c.name, c.place, null, `c${c.name}`)) : [item("None this week", "work continues on ongoing records", null, "c-none")]}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    ),
  };
}

/** Region by region (or site / city / record) figures: records, status, silt and length, progress. */
function detailsCard(s: InfographicSummary) {
  if (s.rows.length < 2) return null;
  const COLS = { name: 220, records: 76, done: 100, ongoing: 92, silt: 168, length: 120, progress: 120 } as const;
  const ROW = 52;
  const HEAD = 40;
  const TOTAL_ROW = 58;
  const h = 72 + 68 + HEAD + s.rows.length * ROW + TOTAL_ROW + (s.rowsMore ? 30 : 0);
  const nameHead = { region: "Region", site: "Site", city: "City / municipality", record: "Record" }[s.rowsKind];
  // The line under each name, unless every row has the same one (all cities of one region).
  const showSub = s.rowsKind === "region" || new Set(s.rows.map((r) => r.sub)).size > 1;
  const head = (text: string, width: number, right = true) => (
    <div style={{ display: "flex", width, justifyContent: right ? "flex-end" : "flex-start", fontFamily: SANS, fontWeight: 700, fontSize: 13, letterSpacing: 1.5, color: C.muted }}>
      {text.toUpperCase()}
    </div>
  );
  const num = (main: string, sub: string | null, width: number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1.1, color: C.navy }}>{main}</div>
      {sub ? <div style={{ fontFamily: SANS, fontSize: 13, color: C.muted }}>{sub}</div> : null}
    </div>
  );
  // The record's statuses as one small stacked bar.
  const mini = (r: InfographicRow, width: number) => (
    <div style={{ display: "flex", width, height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: C.track }}>
      {STATUS_ORDER.map((k) => (r[k] > 0 ? <div key={k} style={{ display: "flex", width: Math.max(2, Math.round((width * r[k]) / Math.max(1, r.records))), height: 8, backgroundColor: STATUS[k].color }} /> : null))}
    </div>
  );
  const row = (r: InfographicRow, i: number | null) => (
    <div
      key={i === null ? "total" : `${r.label}-${i}`}
      style={{
        display: "flex",
        alignItems: "center",
        height: i === null ? TOTAL_ROW : ROW,
        backgroundColor: i === null ? "#eef3f9" : i % 2 ? "#ffffff" : "#f8fafc",
        borderTop: i === null ? `2px solid ${C.navy}` : "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: COLS.name, paddingLeft: 12 }}>
        <div style={{ fontFamily: i === null ? DISPLAY : SANS, fontWeight: 700, fontSize: i === null ? 22 : 17, lineHeight: 1.15, color: C.text }}>{i === null ? "TOTAL" : cut(r.label, 24)}</div>
        {r.sub && (i === null || showSub) ? <div style={{ fontFamily: SANS, fontSize: 13, color: C.muted }}>{cut(r.sub, 28)}</div> : null}
      </div>
      {num(int(r.records), null, COLS.records)}
      {num(int(r.done), r.records ? pct((100 * r.done) / r.records) : null, COLS.done)}
      {num(int(r.ongoing), null, COLS.ongoing)}
      {num(r.volume.acc > 0 ? `${compact(r.volume.acc)} m³` : "—", r.volume.plan > 0 ? `of ${compact(r.volume.plan)} m³` : null, COLS.silt)}
      {num(r.length.done > 0 ? km(r.length.done) : "—", r.length.plan > 0 ? `of ${km(r.length.plan)}` : null, COLS.length)}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: COLS.progress, paddingRight: 12 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1.1, color: C.navy }}>{pct(r.pct)}</div>
        {mini(r, COLS.progress - 24)}
      </div>
    </div>
  );
  const total: InfographicRow = {
    label: "TOTAL",
    sub: `${int(s.records)} ${s.scope.recordsWord}`,
    pct: s.overall,
    records: s.records,
    done: s.status.done,
    ongoing: s.status.ongoing,
    pending: s.status.pending,
    none: s.status.none,
    volume: s.volume,
    length: s.length,
  };
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="list" note={s.rowsMore ? `top ${s.rows.length} by progress` : "best progress first"}>
          {`Details by ${s.rowsKind}`}
        </SectionTitle>
        <div style={{ display: "flex", alignItems: "center", height: HEAD, borderBottom: `2px solid ${C.navy}` }}>
          <div style={{ display: "flex", width: COLS.name, paddingLeft: 12 }}>{head(nameHead, COLS.name - 12, false)}</div>
          {head("Records", COLS.records)}
          {head("Completed", COLS.done)}
          {head("Ongoing", COLS.ongoing)}
          {head("Silt removed", COLS.silt)}
          {head("Length", COLS.length)}
          <div style={{ display: "flex", width: COLS.progress, paddingRight: 12, justifyContent: "flex-end" }}>{head("Progress", COLS.progress - 12)}</div>
        </div>
        {s.rows.map((r, i) => row(r, i))}
        {s.rowsMore ? (
          <div style={{ display: "flex", height: 30, alignItems: "center", paddingLeft: 12, fontFamily: SANS, fontSize: 15, color: C.muted }}>
            {`+ ${int(s.rowsMore)} more ${s.rowsKind === "city" ? "cities" : `${s.rowsKind}s`}, counted in the total`}
          </div>
        ) : null}
        {row(total, null)}
      </Card>
    ),
  };
}

function topCard(s: InfographicSummary) {
  if (!s.top.length) return null;
  const ROW = 80;
  const h = 72 + 68 + s.top.length * ROW;
  const max = s.top[0]!.volume || 1;
  const drainageOnly = s.scope.types.length === 1 && s.scope.types[0] === "drainage";
  const nameW = 400;
  const barW = INNER - 72 - 56 - nameW - 150 - 3 * 18;
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="trophy">{drainageOnly ? "Most silt declogged" : "Most silt removed"}</SectionTitle>
        {s.top.map((t, i) => (
          <div key={t.name} style={{ display: "flex", alignItems: "center", height: ROW, gap: 18, borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div
              style={{
                display: "flex",
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: i === 0 ? C.gold : C.navy,
                color: i === 0 ? C.navy : C.gold,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 30,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {String(i + 1)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: nameW }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 23, color: C.text }}>{cut(t.name, 30)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", height: 22, padding: "0 8px", alignItems: "center", borderRadius: 11, backgroundColor: STATUS[t.status].color, fontFamily: SANS, fontWeight: 700, fontSize: 13, color: "#fff" }}>
                  {STATUS[t.status].label}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 16, color: C.muted }}>{cut(`${t.place}${t.pct !== null ? ` · ${pct(t.pct)}` : ""}`, 34)}</div>
              </div>
            </div>
            <Bar value={(100 * t.volume) / max} width={barW} height={16} color={C.orange} />
            <div style={{ display: "flex", flexDirection: "column", width: 150, alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1.05, color: C.navy }}>{compact(t.volume)}</div>
                <div style={{ fontFamily: SANS, fontSize: 18, color: C.muted }}>m³</div>
              </div>
              {t.plan ? <div style={{ fontFamily: SANS, fontSize: 14, color: C.muted }}>{`of ${compact(t.plan)} m³ planned`}</div> : null}
            </div>
          </div>
        ))}
      </Card>
    ),
  };
}

function photosCard(s: InfographicSummary, photos: InfographicPhoto[]) {
  const GAP = 20;
  // Full rows of three (six when there are enough), else what there is.
  const shown = photos.length >= 6 ? photos.slice(0, 6) : photos.length >= 3 ? photos.slice(0, 3) : photos;
  const cols = Math.max(1, Math.min(3, shown.length));
  const rowsN = Math.ceil(shown.length / 3);
  const W = Math.floor((INNER - 72 - GAP * (cols - 1)) / cols);
  const IMG_H = shown.length === 1 ? 420 : Math.round(W * 0.75);
  const CAPTION = 84;
  const STATS_H = 104;
  const h = 72 + 68 + STATS_H + (shown.length ? 28 + rowsN * (IMG_H + CAPTION) + (rowsN - 1) * 24 : 0);
  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: "image", value: int(s.field.photos), label: "field photos" },
    { icon: "camera", value: int(s.field.documented), label: `${s.scope.recordsWord} documented` },
    { icon: "map", value: s.points.total ? pct((100 * s.points.cleaned) / s.points.total) : "—", label: s.points.total ? `of ${compact(s.points.total)} traced points cleaned` : "no traced points yet" },
    { icon: "activity", value: int(s.updates7d), label: "log entries, last 7 days" },
  ];
  const SW = (INNER - 72 - 3 * 16) / 4;
  return {
    h,
    node: (
      <Card style={{ height: h }}>
        <SectionTitle icon="camera" note={shown.length ? "latest field photos" : undefined}>
          From the field
        </SectionTitle>
        <div style={{ display: "flex", gap: 16 }}>
          {stats.map((t) => (
            <div key={t.label} style={{ display: "flex", flexDirection: "column", width: SW, height: STATS_H, padding: "14px 16px", borderRadius: 18, backgroundColor: "#f6f8fb", border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={t.icon} size={22} color={C.blue} />
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, lineHeight: 1, color: C.navy }}>{t.value}</div>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 16, lineHeight: 1.2, color: C.muted, marginTop: 8 }}>{cut(t.label, 40)}</div>
            </div>
          ))}
        </div>
        {shown.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 28 }}>
            {Array.from({ length: rowsN }, (_, r) => shown.slice(r * 3, r * 3 + 3)).map((row, r) => (
              <div key={r} style={{ display: "flex", gap: GAP }}>
                {row.map((p) => (
                  <div key={p.src.slice(-40)} style={{ display: "flex", flexDirection: "column", width: W, height: IMG_H + CAPTION }}>
                    <img src={p.src} width={W} height={IMG_H} style={{ width: W, height: IMG_H, borderRadius: 20, objectFit: "cover" }} />
                    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, lineHeight: 1.2, color: C.text, marginTop: 12 }}>{cut(p.name, shown.length === 1 ? 70 : 44)}</div>
                    <div style={{ fontFamily: SANS, fontSize: 16, color: C.muted }}>{cut([p.place, shortDay(p.day)].filter(Boolean).join(" · "), shown.length === 1 ? 90 : 36)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    ),
  };
}

function footer(s: InfographicSummary, a: InfographicAssets, hl: Highlights, site: string) {
  const H = 190;
  return {
    h: H,
    node: (
      <div style={{ display: "flex", position: "relative", width: WIDTH, height: H, backgroundColor: C.navy, padding: `0 ${PAD}px`, alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: WIDTH, height: 8, backgroundImage: `linear-gradient(90deg, ${C.gold}, ${C.orange})` }} />
        <img src={a.okbLogo} width={70} height={80} style={{ width: 70, height: 80 }} />
        <div style={{ display: "flex", flexDirection: "column", width: INNER - 70 - 2 * 28 - 400 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 19, color: "#fff" }}>Source: OKB Single Source of Truth (SSOT v2)</div>
          <div style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.35, color: "rgba(255,255,255,0.75)" }}>
            {`Compiled from DPWH regional and district office reports. Figures as of ${manilaDate(s.asOf)}.${hl.by === "ai" ? " Highlights written with AI (Claude) from these figures." : ""}`}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 400 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 16, letterSpacing: 2, color: C.gold }}>LIVE DASHBOARD</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, lineHeight: 1.15, color: "#fff", textAlign: "right" }}>{cut(site, 34)}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>/accomplishment</div>
        </div>
      </div>
    ),
  };
}

/** The finished image. */
export function renderInfographic(s: InfographicSummary, hl: Highlights, a: InfographicAssets, photos: InfographicPhoto[], site: string): ImageResponse {
  const GAP = 32;
  const head = header(s, a);
  const body = [highlightsCard(s, hl), tiles(s), byTypeCard(s), statusCard(s), trendCard(s), mapAndRows(s), detailsCard(s), topCard(s), photosCard(s, photos)].filter((x): x is { h: number; node: React.JSX.Element } => x !== null);
  const foot = footer(s, a, hl, site);
  const height = head.h + 40 + body.reduce((n, b) => n + b.h, 0) + GAP * (body.length - 1) + 56 + foot.h;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: WIDTH, height, backgroundColor: C.page, fontFamily: SANS }}>
        {head.node}
        <div style={{ display: "flex", flexDirection: "column", gap: GAP, padding: `40px ${PAD}px 0` }}>{body.map((b, i) => <div key={i} style={{ display: "flex", flexDirection: "column" }}>{b.node}</div>)}</div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        {foot.node}
      </div>
    ),
    { width: WIDTH, height, fonts: a.fonts },
  );
}
