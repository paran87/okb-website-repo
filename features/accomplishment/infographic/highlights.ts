import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { compact, int, km, manilaDate, pct } from "@/features/accomplishment/infographic/format";
import type { InfographicSummary } from "@/features/accomplishment/infographic/summary";

/**
 * The infographic's headline and three highlights. Claude writes them from the figures already on the image
 * (needs ANTHROPIC_API_KEY); every number in its text must be one of those figures, written the same way, or
 * the rule-based text below is used instead. The same figures get the same text for an hour.
 */

const log = logger.child({ module: "accomplishment-infographic" });
const MODEL = "claude-opus-5-5";

export interface Highlights {
  headline: string;
  points: string[];
  /** Who wrote the text. */
  by: "ai" | "rules";
}

export const highlightsConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

/** The figures as the image shows them: the only facts the text may use. */
export function infographicFacts(s: InfographicSummary): Record<string, unknown> {
  const drainageOnly = s.scope.types.length === 1 && s.scope.types[0] === "drainage";
  return {
    program: "Oplan Kontra Baha (DPWH, Philippines): dredging and desilting of rivers and creeks, declogging of drainage",
    as_of: manilaDate(s.asOf),
    record_types: s.scope.typesLabel,
    regions_shown: s.scope.regionsLabel,
    progress_measure: s.scope.mode === "wtd" ? "weighted by planned volume" : "average of all records",
    overall_progress: pct(s.overall),
    records: `${int(s.records)} ${s.scope.recordsWord}`,
    sites: int(s.sites),
    regions_with_work: int(s.regions),
    completed: int(s.status.done),
    ongoing: int(s.status.ongoing),
    not_started: int(s.status.pending),
    no_report_yet: int(s.status.none),
    [drainageOnly ? "silt_and_debris_declogged" : "silt_removed"]: s.volume.acc > 0 ? `${compact(s.volume.acc)} m³` : "none reported",
    volume_planned: s.volume.plan > 0 ? `${compact(s.volume.plan)} m³` : "not set",
    share_of_planned_volume_done: s.volume.plan > 0 ? pct((100 * s.volume.acc) / s.volume.plan) : "n/a",
    length_cleaned: s.length.done > 0 ? km(s.length.done) : "none reported",
    length_planned: s.length.plan > 0 ? km(s.length.plan) : "not set",
    field_updates_last_7_days: int(s.updates7d),
    [`${s.rowsKind === "city" ? "cities" : `${s.rowsKind}s`}_by_progress`]: s.rows.slice(0, 6).map((r) => `${r.label}: ${pct(r.pct)} (${int(r.done)} of ${int(r.records)} done)`),
    most_silt_removed: s.top.slice(0, 3).map((t) => `${t.name} (${t.place}): ${compact(t.volume)} m³`),
  };
}

/** Rule-based headline and highlights (no AI, or its text was rejected). */
export function ruleHighlights(s: InfographicSummary): Highlights {
  const where = s.scope.allRegions ? `across ${int(s.regions)} regions` : `in ${s.scope.regionsLabel}`;
  const kind = s.scope.types.length === 1 ? { waterway: "waterway", drainage: "drainage", isf: "ISF" }[s.scope.types[0]!] : "flood-control";
  const headline = s.overall === null ? `Oplan Kontra Baha ${kind} work ${where}` : `${pct(s.overall)} of ${kind} work done ${where}`;
  const points: string[] = [];
  points.push(`${int(s.status.done)} of ${int(s.records)} ${s.scope.recordsWord} completed and ${int(s.status.ongoing)} ongoing.`);
  const verb = s.scope.types.length === 1 && s.scope.types[0] === "drainage" ? "declogged" : "removed";
  if (s.volume.acc > 0) {
    points.push(
      s.volume.plan > 0
        ? `${compact(s.volume.acc)} m³ of silt ${verb}, ${pct((100 * s.volume.acc) / s.volume.plan)} of the ${compact(s.volume.plan)} m³ planned.`
        : `${compact(s.volume.acc)} m³ of silt ${verb} so far.`,
    );
  }
  const lead = s.rows.find((r) => (r.pct ?? 0) > 0);
  const plural = s.rowsKind === "city" ? "cities" : `${s.rowsKind}s`;
  if (lead && s.rowsKind !== "record") points.push(`${lead.label} leads the ${plural} at ${pct(lead.pct)}, with ${int(lead.done)} of ${int(lead.records)} done.`);
  if (points.length < 3 && s.updates7d > 0) points.push(`${int(s.updates7d)} field updates were logged in the last 7 days.`);
  if (points.length < 3 && s.length.done > 0) points.push(`${km(s.length.done)} of waterway length cleaned.`);
  if (points.length < 3) points.push(`${int(s.status.none)} ${s.scope.recordsWord} have no report yet.`);
  return { headline, points: points.slice(0, 3), by: "rules" };
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const numbersIn = (text: string) => (text.match(NUMBER) ?? []).map((n) => n.replace(/,/g, ""));

/** True when every number in [text] is one of the facts' numbers (or a small count up to 10). */
export function usesOnlyFacts(text: string, facts: string): boolean {
  const allowed = new Set(numbersIn(facts));
  return numbersIn(text).every((n) => allowed.has(n) || (/^\d+$/.test(n) && Number(n) <= 10));
}

const resultSchema = z.object({ headline: z.string().min(3), highlights: z.array(z.string().min(3)).min(2) });

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "highlights"],
  properties: {
    headline: { type: "string", description: "Up to 12 words." },
    highlights: { type: "array", items: { type: "string", description: "One sentence of up to 22 words." } },
  },
};

const PROMPT = `You write the headline and three highlights printed on a public infographic about the Oplan Kontra Baha flood-control program of the Department of Public Works and Highways (DPWH), Philippines. The facts below are everything you know.

- Use only numbers that appear in the facts, written exactly as they appear there (same rounding, same units, same % sign). Never work out a new number: no sums, differences, ratios or rankings that are not given.
- Headline: up to 12 words, plain and factual, no exclamation mark, no colon.
- Highlights: exactly 3, each one sentence of up to 22 words, each about a different fact. Say what was done; mention what is still pending only where the facts show it.
- Plain English for the general public. No jargon, no hype words, no emoji, no praise or blame, no predictions.

Facts:
`;

async function writeWithClaude(facts: string): Promise<{ headline: string; points: string[] }> {
  // Two tries of 15 s at most, so the image is still made within the route's time.
  const client = new Anthropic({ timeout: 15_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMA } },
    messages: [{ role: "user", content: `${PROMPT}${facts}` }],
  });
  if (response.stop_reason === "refusal") throw new Error(`declined (${response.stop_details?.category ?? "no category"})`);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = resultSchema.parse(JSON.parse(text));
  return { headline: parsed.headline.trim(), points: parsed.highlights.slice(0, 3).map((h) => h.trim()) };
}

/** Claude's text for these figures (cached an hour; a failure is not cached). */
const cachedClaude = (facts: string) =>
  unstable_cache(() => writeWithClaude(facts), ["okb-infographic-highlights", createHash("sha256").update(facts).digest("hex").slice(0, 32)], {
    revalidate: 3600,
  })();

export async function getHighlights(s: InfographicSummary, useAi: boolean): Promise<Highlights> {
  const rules = ruleHighlights(s);
  if (!useAi || !highlightsConfigured()) return rules;
  const facts = JSON.stringify(infographicFacts(s), null, 1);
  try {
    const ai = await cachedClaude(facts);
    const tooLong = ai.headline.length > 110 || ai.points.some((p) => p.length > 200);
    if (tooLong || ![ai.headline, ...ai.points].every((t) => usesOnlyFacts(t, facts))) {
      log.warn({ headline: ai.headline }, "Infographic highlights rejected (numbers not in the figures, or too long)");
      return rules;
    }
    return { headline: ai.headline, points: ai.points, by: "ai" };
  } catch (err) {
    if (err instanceof Anthropic.APIError) log.warn({ status: err.status }, "Infographic highlights failed (Claude API)");
    else log.warn({ err }, "Infographic highlights failed");
    return rules;
  }
}
