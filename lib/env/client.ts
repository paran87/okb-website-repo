import { z } from "zod";

/**
 * Client-safe environment schema.
 *
 * Only `NEXT_PUBLIC_*` variables are available in the browser bundle. They must
 * be referenced statically (not via a dynamic key) so Next.js can inline them
 * at build time — hence the explicit object below.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("OKB Command Center"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),

  NEXT_PUBLIC_MAP_STYLE_URL: z
    .string()
    .url()
    .default(
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    ),
  NEXT_PUBLIC_MAP_DEFAULT_LNG: z.coerce.number().default(121.774),
  NEXT_PUBLIC_MAP_DEFAULT_LAT: z.coerce.number().default(12.8797),
  NEXT_PUBLIC_MAP_DEFAULT_ZOOM: z.coerce.number().default(5.2),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  NEXT_PUBLIC_MAP_DEFAULT_LNG: process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG,
  NEXT_PUBLIC_MAP_DEFAULT_LAT: process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT,
  NEXT_PUBLIC_MAP_DEFAULT_ZOOM: process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid client environment configuration:\n${issues}`);
}

export const clientEnv: ClientEnv = parsed.data;
