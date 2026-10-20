import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getOperationsR2Config, r2Fetch } from "@/features/operations/server/r2";
import type { PhotoVerdict } from "@/features/flood-report/lib/stretch";

/**
 * AI check of OKB Mobile report photos: does each photo show floodwater on a road? Used only when a report's
 * photos are far enough apart to draw a flooded stretch (features/flood-report/server/stretch.ts), so a photo
 * of a dry road does not stretch the flood to it. Needs ANTHROPIC_API_KEY on the server; without it stretches
 * are drawn from the photo locations alone (the report still waits for operator review).
 */

const log = logger.child({ module: "flood-photo-check" });
const MODEL = "claude-opus-5-5";

export function photoCheckConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const resultSchema = z.object({
  photos: z.array(
    z.object({
      photo: z.number().int(),
      flooded: z.enum(["yes", "no", "unclear"]),
      note: z.string(),
    }),
  ),
});

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["photos"],
  properties: {
    photos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["photo", "flooded", "note"],
        properties: {
          photo: { type: "integer", description: "The photo number as labeled." },
          flooded: { type: "string", enum: ["yes", "no", "unclear"] },
          note: { type: "string", description: "Up to 15 words on what the photo shows." },
        },
      },
    },
  },
};

const PROMPT = `These photos were sent by a member of the public as one flood report from the Philippines (mostly Metro Manila). Each photo was taken at a different spot; the report will be drawn on a map as a flooded stretch of road between the photos that show flooding.

For each photo, decide whether it shows floodwater on a road or street at the spot where it was taken:
- "yes": standing or flowing floodwater covers part or all of the road (any depth, from gutter-deep up).
- "no": the road is visible and dry or only wet from rain (puddles in potholes or a wet surface are not a flood), or the photo shows no road conditions at all (a ceiling, a screen, a selfie, darkness).
- "unclear": too dark, blurry or blocked to tell.
Ignore the text stamp printed on the photo when judging. Answer for every photo.`;

async function photoBytes(key: string): Promise<string | null> {
  const cfg = getOperationsR2Config();
  if (!cfg) return null;
  const res = await r2Fetch(cfg, "GET", key, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

/**
 * Verdicts for the photos [check] (R2 keys), keyed by photo key. All photos of the report ([all], in the order
 * taken) are labeled by their number, so the model can compare them. Null when the check failed.
 */
export async function checkPhotos(all: string[], check: string[]): Promise<Record<string, PhotoVerdict> | null> {
  if (!photoCheckConfigured() || !check.length) return null;
  try {
    const images = await Promise.all(check.map((key) => photoBytes(key)));
    if (images.some((b) => b === null)) return null;
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    check.forEach((key, i) => {
      content.push({ type: "text", text: `Photo ${all.indexOf(key) + 1}:` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: images[i] as string } });
    });
    content.push({ type: "text", text: PROMPT });

    // Two tries of 20 s at most, so a report is still saved within the route's 60 s.
    const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") {
      log.warn({ category: response.stop_details?.category ?? null }, "Flood photo check declined");
      return null;
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = resultSchema.parse(JSON.parse(text));
    const out: Record<string, PhotoVerdict> = {};
    for (const key of check) {
      const n = all.indexOf(key) + 1;
      const found = parsed.photos.find((p) => p.photo === n);
      out[key] = found ? { flooded: found.flooded, note: found.note.slice(0, 160) } : { flooded: "unclear", note: "Not answered" };
    }
    return out;
  } catch (err) {
    if (err instanceof Anthropic.APIError) log.warn({ status: err.status }, "Flood photo check failed (Claude API)");
    else log.warn({ err }, "Flood photo check failed");
    return null;
  }
}
