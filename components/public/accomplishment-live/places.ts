import type { Selection } from "@/components/public/accomplishment-live/regions";

/**
 * A place to filter the field updates by, picked from the search box: a region, a site (province / district),
 * a city or municipality, or any text ("Updates mentioning …") for a barangay or a road.
 */
export interface Place {
  kind: "region" | "site" | "city" | "text";
  /** As shown ("Region X", "CAGAYAN DE ORO CITY", "kauswagan"). */
  label: string;
  /** The region it is in (region code), for sites and cities. */
  region: string;
  /** Records in it, for the search list. */
  records: number;
  /** A region's name ("CALABARZON", "Bicol"), also searched. */
  alias?: string;
}

/** Comparable text: upper case, accents and punctuation folded, single spaces. */
export const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/** "Region X" and "X" are the same region. */
const regionNorm = (s: string | null | undefined) => norm(s).replace(/^REGION /, "");
export const sameRegion = (a: string | null | undefined, b: string | null | undefined) => regionNorm(a) !== "" && regionNorm(a) === regionNorm(b);

/** Every region, site and city of the dashboard's records, with how many records each has. */
export function listPlaces(records: (Selection & { regionKey?: string })[], regionNames: Map<string, string> = new Map()): Place[] {
  const regions = new Map<string, Place>();
  const local = new Map<string, Place>();
  for (const r of records) {
    const rk = regionNorm(r.region);
    if (rk) {
      const p = regions.get(rk) ?? { kind: "region" as const, label: r.region, region: r.region, records: 0, alias: regionNames.get(r.region) || undefined };
      p.records++;
      regions.set(rk, p);
    }
    // A site and a city with the same name in a region are one place.
    const names = new Map<string, Place["kind"]>();
    if (r.site) names.set(norm(r.site), "site");
    const city = r.record.x?.city;
    if (city && !names.has(norm(city))) names.set(norm(city), "city");
    for (const [n, kind] of names) {
      if (!n) continue;
      const key = `${rk}|${n}`;
      const label = kind === "site" ? r.site : (city ?? "");
      const p = local.get(key) ?? { kind, label, region: r.region, records: 0 };
      p.records++;
      local.set(key, p);
    }
  }
  return [...regions.values(), ...local.values()];
}

/** The places whose name contains [q], regions first, then the ones with the most records. */
export function searchPlaces(places: Place[], q: string, max = 6): Place[] {
  const needle = norm(q);
  if (needle.length < 2) return [];
  const order = { region: 0, site: 1, city: 2, text: 3 };
  // "Region X" names one region: Regions XI to XIII, which only start the same way, are left out.
  const exactRegion = places.some((p) => p.kind === "region" && regionNorm(p.label) === regionNorm(q));
  return places
    .filter((p) =>
      p.kind === "region"
        ? exactRegion
          ? regionNorm(p.label) === regionNorm(q)
          : norm(p.label).includes(needle) || norm(p.alias).includes(needle)
        : norm(p.label).includes(needle),
    )
    .sort((a, b) => {
      const exact = Number(norm(b.label) === needle) - Number(norm(a.label) === needle);
      return exact || order[a.kind] - order[b.kind] || b.records - a.records || a.label.localeCompare(b.label);
    })
    .slice(0, max);
}

/** Whether something at this region / site / city (and with this name) is in the place. */
export function inPlace(place: Place, at: { region?: string | null; site?: string | null; city?: string | null; name?: string | null }): boolean {
  if (place.kind === "region") return sameRegion(at.region, place.region);
  if (place.kind === "text") {
    const needle = norm(place.label);
    return [at.region, at.site, at.city, at.name].some((t) => norm(t).includes(needle));
  }
  const target = norm(place.label);
  const here = norm(at.site) === target || norm(at.city) === target;
  return here && (!place.region || !at.region || sameRegion(at.region, place.region));
}

export const placeWord = (p: Place) => (p.kind === "region" ? "Region" : p.kind === "site" ? "Site" : p.kind === "city" ? "City / municipality" : "Text");

/** Whether [q] names a place exactly (then "Updates mentioning …" adds nothing). */
export function namesPlace(places: Place[], q: string): boolean {
  const needle = norm(q);
  return places.some((p) => norm(p.label) === needle || norm(p.alias) === needle || (p.kind === "region" && regionNorm(p.label) === regionNorm(q)));
}
