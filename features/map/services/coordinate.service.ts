import type { LngLat } from "@/types/geo";
import type {
  CoordinateFormatOptions,
  CrsId,
  FormattedCoordinates,
  SearchOptions,
  SearchResult,
} from "@/features/map/types";
import { isValidLngLat } from "@/utils/geo";

const MOCK_SEARCH_INDEX: readonly SearchResult[] = [
  {
    id: "sr-road-1",
    label: "EDSA",
    subtitle: "Major highway · Quezon City",
    category: "road",
    coordinates: [121.0435, 14.6342],
  },
  {
    id: "sr-road-2",
    label: "C-5 Road",
    subtitle: "Circumferential · Taguig",
    category: "road",
    coordinates: [121.0412, 14.4876],
  },
  {
    id: "sr-brgy-1",
    label: "Barangay Kamuning",
    subtitle: "Quezon City",
    category: "barangay",
    coordinates: [121.0435, 14.6342],
  },
  {
    id: "sr-brgy-2",
    label: "Barangay Industrial Valley",
    subtitle: "Marikina City",
    category: "barangay",
    coordinates: [121.0821, 14.6503],
  },
  {
    id: "sr-city-1",
    label: "Quezon City",
    subtitle: "NCR",
    category: "city",
    coordinates: [121.05, 14.65],
  },
  {
    id: "sr-city-2",
    label: "Marikina City",
    subtitle: "NCR",
    category: "city",
    coordinates: [121.09, 14.65],
  },
  {
    id: "sr-proj-1",
    label: "Flood Control Phase 2",
    subtitle: "Marikina River",
    category: "project",
    coordinates: [121.085, 14.652],
  },
  {
    id: "sr-eq-1",
    label: "Pump Station QC-3",
    subtitle: "Equipment depot",
    category: "equipment",
    coordinates: [121.025, 14.62],
  },
];

/** Mock geocoder — future: wire to Nominatim / internal geocoder API. */
export const searchService = {
  async search(options: SearchOptions): Promise<readonly SearchResult[]> {
    const q = options.query.trim().toLowerCase();
    if (!q) return [];

    const coordMatch = parseCoordinateQuery(q);
    if (coordMatch) {
      return [coordMatch];
    }

    const limit = options.limit ?? 8;
    const categories = options.categories;

    return MOCK_SEARCH_INDEX.filter((item) => {
      if (categories && !categories.includes(item.category)) return false;
      return (
        item.label.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
      );
    }).slice(0, limit);
  },
};

function parseCoordinateQuery(query: string): SearchResult | null {
  const parts = query.split(/[,\s]+/).map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  const [a, b] = parts as [number, number];
  const lngLat: LngLat =
    Math.abs(a) <= 90 && Math.abs(b) > 90 ? [b, a] : [a, b];
  if (!isValidLngLat(lngLat)) return null;
  return {
    id: `coord-${lngLat.join("-")}`,
    label: `${lngLat[1].toFixed(5)}°, ${lngLat[0].toFixed(5)}°`,
    subtitle: "Coordinates (WGS84)",
    category: "coordinates",
    coordinates: lngLat,
  };
}

/** WGS84 coordinate formatting utilities. */
export const coordinateService = {
  format(
    [lng, lat]: LngLat,
    options: CoordinateFormatOptions = {},
  ): FormattedCoordinates {
    const precision = options.precision ?? 5;
    const crs: CrsId = options.crs ?? "EPSG:4326";
    const result: FormattedCoordinates = {
      lng,
      lat,
      crs,
      decimal: `${lat.toFixed(precision)}°, ${lng.toFixed(precision)}°`,
    };
    if (options.includeDms) {
      result.dms = `${toDms(lat, "lat")} ${toDms(lng, "lng")}`;
    }
    return result;
  },

  copyText(formatted: FormattedCoordinates): string {
    return `${formatted.lat}, ${formatted.lng} (${formatted.crs})`;
  },
};

function toDms(value: number, axis: "lat" | "lng"): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${deg}°${min}'${sec}"${dir}`;
}
