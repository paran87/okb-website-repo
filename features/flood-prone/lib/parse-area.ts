import type { DeosFloodProneArea } from "@/features/flood-prone/types";

const NCR_CITIES = [
  "Quezon City",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Pateros",
  "San Juan",
  "Taguig",
  "Valenzuela",
  "Caloocan",
] as const;

/** Used when the description names no city; only unambiguous DEOs are mapped. */
const DEO_FALLBACK: Record<string, string> = {
  "Quezon City 1st": "Quezon City",
  "Quezon City 2nd": "Quezon City",
  "Malabon - Navotas": "Malabon / Navotas",
};

function decode(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function displayCity(city: string): string {
  return city === "Quezon City" || city.endsWith(" City") ? city : `${city} City`;
}

export interface ParsedArea {
  municipality: string;
  location: string;
  road: string;
}

/** Splits a DEOS description into municipality, location detail and road. */
export function parseArea(area: DeosFloodProneArea): ParsedArea {
  const text = decode(area.description);
  const lower = text.toLowerCase();

  const city = NCR_CITIES.find((c) => lower.includes(c.toLowerCase()));
  const municipality = city
    ? displayCity(city)
    : (DEO_FALLBACK[area.deo] ?? "Unspecified");

  const barangay = /\bBrgy\.?\s+([^,]+)/i.exec(text)?.[1]?.trim();
  const parens = [...text.matchAll(/\(([^)]*)\)/g)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean);
  const location = barangay
    ? `Brgy. ${barangay}`
    : parens.length > 0
      ? parens.join("; ")
      : "—";

  const road =
    text
      .split(/\(|,/)[0]
      ?.trim()
      .replace(/\s+/g, " ") || text;

  return { municipality, location, road };
}
