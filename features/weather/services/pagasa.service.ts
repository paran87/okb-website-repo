import "server-only";

import { PAGASA_WEATHER_BULLETIN } from "@/features/weather/data/mock-pagasa-weather";
import {
  PAGASA_HOME_URL,
  PAGASA_REGIONAL_PAGES,
  PAGASA_TENDAY_ISSUANCE_URL,
} from "@/features/weather/config/regions";
import { pagasaFetchJson, pagasaFetchText } from "@/features/weather/services/pagasa-fetch";
import type {
  PagasaAdvisoryLevel,
  PagasaNcrSummary,
  PagasaWeatherAdvisory,
  PagasaWeatherBulletinResponse,
  PagasaWeatherCondition,
  PagasaRegionalForecast,
} from "@/features/weather/types";

const REVALIDATE_SECONDS = 600;

interface PagasaWarningRegion {
  area?: string;
  areas?: string;
  issued_at?: string;
  expired_at?: string;
  description?: string;
}

interface PagasaAwsReading {
  datetime?: string;
  temperature?: string;
  heat_index?: string;
  humidity?: string;
  wind_speed?: string;
  wind_direction?: string;
  precipitation?: string;
  site_name?: string;
}

interface PagasaHomePayload {
  Weather?: {
    NearestAWS?: Record<string, PagasaAwsReading[]>;
    CurrentWeather?: Record<
      string,
      { desc?: string; datetime?: string; temperature?: string }
    >;
  };
  Map?: {
    ActiveWarning?: Record<
      string,
      Array<{
        regions?: Record<string, PagasaWarningRegion>;
      }>
    >;
  };
}

interface PagasaIssuance {
  latest_date?: string;
  latest_time?: string;
  start_date?: string;
  end_date?: string;
}

interface ParsedRegionalPage {
  issuedAt: string;
  forecast: string;
  tempMin: number;
  tempMax: number;
  wind: string;
  coastal: string;
}

let cachedBulletin: PagasaWeatherBulletinResponse | null = null;
let cachedBulletinAt = 0;

/** Live PAGASA bulletin with short in-memory cache between requests. */
export async function getPagasaWeatherBulletin(): Promise<PagasaWeatherBulletinResponse> {
  const now = Date.now();
  if (
    cachedBulletin &&
    cachedBulletin.regions.length > 0 &&
    now - cachedBulletinAt < REVALIDATE_SECONDS * 1000
  ) {
    return cachedBulletin;
  }

  try {
    const bulletin = await fetchLivePagasaBulletin();
    if (bulletin.regions.length > 0) {
      cachedBulletin = bulletin;
      cachedBulletinAt = now;
    }
    return bulletin;
  } catch (error) {
    console.error("PAGASA weather fetch failed, using fallback:", error);
    return {
      ...PAGASA_WEATHER_BULLETIN,
      fetchedAt: new Date().toISOString(),
      source: "fallback",
    };
  }
}

/** Metro Manila observation derived from the latest PAGASA feed. */
export async function getPagasaNcrSummary(): Promise<PagasaNcrSummary> {
  const bulletin = await getPagasaWeatherBulletin();
  if (bulletin.ncrObservation) {
    return bulletin.ncrObservation;
  }

  return mapNcrFromMock();
}

async function fetchLivePagasaBulletin(): Promise<PagasaWeatherBulletinResponse> {
  const [homePayload, issuance, regionalPages] = await Promise.all([
    fetchPagasaHomePayload(),
    fetchPagasaIssuance(),
    fetchAllRegionalForecasts(),
  ]);

  const advisories = extractAdvisories(homePayload);
  const synopticSituation = buildSynopticSituation(homePayload);
  const generalForecast = buildGeneralForecast(homePayload, advisories);
  const regions = buildRegionalForecasts(regionalPages);
  const ncrObservation = extractNcrSummary(homePayload, advisories);

  return {
    issuedAt: formatIssuedAt(issuance, regionalPages[0]?.issuedAt),
    validPeriod: formatValidPeriod(issuance),
    synopticSituation,
    generalForecast,
    advisories,
    regions,
    ncrObservation,
    fetchedAt: new Date().toISOString(),
    source: "pagasa-live",
  };
}

async function fetchPagasaHomePayload(): Promise<PagasaHomePayload> {
  const response = await pagasaFetchText(PAGASA_HOME_URL);

  if (!response.ok) {
    throw new Error(`PAGASA homepage responded with ${response.status}`);
  }

  const html = response.text;
  const start = html.indexOf("var weather = {");
  const end = html.indexOf("var env", start);

  if (start < 0 || end < 0) {
    throw new Error("PAGASA homepage weather payload not found");
  }

  const jsonText = html.slice(start + "var weather = ".length, end).trim();
  return JSON.parse(jsonText) as PagasaHomePayload;
}

async function fetchPagasaIssuance(): Promise<PagasaIssuance | null> {
  return pagasaFetchJson<PagasaIssuance>(PAGASA_TENDAY_ISSUANCE_URL);
}

async function fetchAllRegionalForecasts(): Promise<
  Array<PagasaRegionalPage & ParsedRegionalPage>
> {
  const results = await Promise.all(
    PAGASA_REGIONAL_PAGES.map(async (page) => {
      const parsed = await fetchRegionalForecastPage(page.slug);
      return parsed ? { ...page, ...parsed } : null;
    }),
  );

  return results.filter(
    (entry): entry is PagasaRegionalPage & ParsedRegionalPage => entry !== null,
  );
}

async function fetchRegionalForecastPage(
  slug: string,
): Promise<ParsedRegionalPage | null> {
  const response = await pagasaFetchText(
    `${PAGASA_HOME_URL}regional-forecast/${slug}`,
  );

  if (!response.ok) return null;
  return parseRegionalForecastHtml(response.text);
}

function parseRegionalForecastHtml(html: string): ParsedRegionalPage | null {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = stripHtml(cleaned).replace(/\s+/g, " ").trim();
  const start = text.indexOf("Issued At:");
  if (start < 0) return null;

  const chunk = text.slice(start, start + 420);
  const issuedMatch = chunk.match(
    /Issued At:\s*(.+?)\s+((?:Cloudy|Partly cloudy|Monsoon|Fair)[^]+?)\s+/i,
  );
  const tempMatch = chunk.match(
    /(\d{2})\D+(\d{2})\D+Wind Speed:\s*(.+?)\s+Direction:\s*(.+?)\s+Coastal Condition:\s*(.+?)(?=Cloudy|Partly|Issued At|$)/i,
  );

  if (!issuedMatch?.[1] || !issuedMatch[2] || !tempMatch?.[1] || !tempMatch[2] || !tempMatch[3] || !tempMatch[4] || !tempMatch[5]) {
    return null;
  }

  return {
    issuedAt: issuedMatch[1].trim(),
    forecast: issuedMatch[2].trim(),
    tempMin: Number(tempMatch[1]),
    tempMax: Number(tempMatch[2]),
    wind: `${tempMatch[3].trim()} ${tempMatch[4].trim()}`,
    coastal: tempMatch[5].trim(),
  };
}

function buildRegionalForecasts(
  pages: Array<PagasaRegionalPage & ParsedRegionalPage>,
): PagasaRegionalForecast[] {
  return pages.map((page) => ({
    id: page.id,
    region: page.region,
    areaLabel: page.areaLabel,
    islandGroup: page.islandGroup,
    condition: mapCondition(page.forecast),
    temperatureMin: page.tempMin,
    temperatureMax: page.tempMax,
    heatIndex: estimateHeatIndex(page.tempMax),
    rainfallOutlook: rainfallOutlookFromForecast(page.forecast),
    wind: page.wind,
    coastalWaters: page.coastal,
    forecast: page.forecast,
  }));
}

function extractAdvisories(payload: PagasaHomePayload): PagasaWeatherAdvisory[] {
  const advisories: PagasaWeatherAdvisory[] = [];
  const activeWarning = payload.Map?.ActiveWarning ?? {};

  for (const [type, entries] of Object.entries(activeWarning)) {
    for (const entry of normalizeWarningEntries(entries)) {
      for (const [area, region] of Object.entries(entry.regions ?? {})) {
        const description = stripHtml(region.description ?? "");
        if (!description) continue;

        advisories.push({
          id: `${type}-${region.issued_at ?? area}`.replace(/\s+/g, "-"),
          type,
          level: mapAdvisoryLevel(type),
          headline: headlineFromDescription(type, description),
          areas: region.areas ?? region.area ?? area,
          validUntil: formatExpiry(region.expired_at),
          detail: description.slice(0, 480),
        });
      }
    }
  }

  return advisories.slice(0, 6);
}

function normalizeWarningEntries(
  value: unknown,
): Array<{ regions?: Record<string, PagasaWarningRegion> }> {
  if (Array.isArray(value)) {
    return value as Array<{ regions?: Record<string, PagasaWarningRegion> }>;
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(
      (entry): entry is { regions?: Record<string, PagasaWarningRegion> } =>
        typeof entry === "object" &&
        entry !== null &&
        "regions" in entry,
    );
  }

  return [];
}

function buildSynopticSituation(payload: PagasaHomePayload): string {
  const tc = payload.Map?.ActiveWarning?.["Tropical Cyclone Alert"]?.[0];
  const par = tc?.regions?.["Philippine Area of Responsibility"];
  const description = stripHtml(par?.description ?? "");

  if (description) {
    const sentences = description
      .split(/\.\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 20)
      .slice(0, 3);
    if (sentences.length > 0) {
      return sentences.map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
    }
  }

  const ncr = payload.Weather?.CurrentWeather?.["133900000"];
  if (ncr?.desc) {
    return `Latest PAGASA observation for Metro Manila indicates ${ncr.desc.toLowerCase()}. Monitor pagasa.dost.gov.ph for synoptic updates.`;
  }

  return "Refer to the latest DOST-PAGASA public weather forecast for the current synoptic situation over the Philippines.";
}

function buildGeneralForecast(
  payload: PagasaHomePayload,
  advisories: PagasaWeatherAdvisory[],
): string {
  const flood = advisories.find((item) =>
    item.type.toLowerCase().includes("flood"),
  );
  if (flood) {
    return `${flood.detail.slice(0, 260)}… Monitor PAGASA flood and rainfall warnings for localized impacts.`;
  }

  const tc = advisories.find((item) =>
    item.type.toLowerCase().includes("cyclone"),
  );
  if (tc) {
    return `${tc.detail.slice(0, 260)}… All information applies to the Philippine Area of Responsibility (PAR) only.`;
  }

  const ncr = payload.Weather?.NearestAWS?.["133900000"]?.[0];
  if (ncr) {
    return `Live PAGASA station reading from ${ncr.site_name ?? "Metro Manila"} as of ${ncr.datetime ?? "latest update"}. Conditions may change rapidly — check official advisories before field deployment.`;
  }

  return "Flooding and rain-induced landslides are possible in areas that are highly or very highly susceptible during heavy rainfall. Localized thunderstorms may bring moderate to heavy rains over short periods.";
}

function extractNcrSummary(
  payload: PagasaHomePayload,
  advisories: PagasaWeatherAdvisory[],
): PagasaNcrSummary {
  const scienceGarden = payload.Weather?.NearestAWS?.["133900000"]?.[0];
  const ncrCurrent = payload.Weather?.CurrentWeather?.["133900000"];
  const cyclone = advisories.find((item) =>
    item.type.toLowerCase().includes("cyclone"),
  );

  const temperature = parseNumeric(scienceGarden?.temperature ?? ncrCurrent?.temperature);
  const rainfall = parseNumeric(scienceGarden?.precipitation);
  const windSpeed = parseNumeric(scienceGarden?.wind_speed);
  const humidity = parseNumeric(scienceGarden?.humidity);
  const heatIndex = parseNumeric(scienceGarden?.heat_index);

  return {
    region: "Metro Manila (NCR)",
    temperature: temperature ?? 0,
    temperatureUnit: "°C",
    rainfall: rainfall ?? 0,
    rainfallUnit: "mm/hr",
    windSpeed: windSpeed ?? 0,
    windUnit: "km/h",
    humidity: humidity ?? 0,
    condition: ncrCurrent?.desc ?? scienceGarden?.site_name ?? "—",
    stormStatus: cyclone?.headline ?? ncrCurrent?.desc ?? "No active cyclone warning for NCR",
    stormTone: cyclone ? "warning" : "normal",
    updatedAt: formatObservationTime(
      scienceGarden?.datetime ?? ncrCurrent?.datetime,
    ),
    heatIndex: heatIndex ?? undefined,
  };
}

function formatIssuedAt(
  issuance: PagasaIssuance | null,
  regionalIssuedAt?: string,
): string {
  if (issuance?.latest_date && issuance.latest_time) {
    return `${issuance.latest_time} PHT, ${formatPagasaDate(issuance.latest_date)}`;
  }
  if (regionalIssuedAt) return `${regionalIssuedAt.trim()} PHT`;
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());
}

function formatValidPeriod(issuance: PagasaIssuance | null): string {
  if (issuance?.start_date && issuance?.end_date) {
    return `${formatPagasaDate(issuance.start_date)} – ${formatPagasaDate(issuance.end_date)} (PAGASA 10-day outlook)`;
  }
  return "Current 24-hour outlook — see pagasa.dost.gov.ph for the full bulletin";
}

function formatPagasaDate(value: string): string {
  const date = new Date(`${value}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatExpiry(value?: string): string {
  if (!value) return "See PAGASA advisory";
  const date = new Date(value.replace(" ", "T") + "+08:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatObservationTime(value?: string): string {
  if (!value) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date());
  }

  const match = value.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
  if (match) return `${match[1]} PHT`;
  return value;
}

function headlineFromDescription(type: string, description: string): string {
  const firstLine = description.split("\n").find((line) => line.trim().length > 8);
  if (!firstLine) return type;
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

function mapAdvisoryLevel(type: string): PagasaAdvisoryLevel {
  const normalized = type.toLowerCase();
  if (normalized.includes("cyclone") || normalized.includes("signal")) {
    return "signal";
  }
  if (normalized.includes("flood") || normalized.includes("rainfall")) {
    return "warning";
  }
  if (normalized.includes("thunder")) {
    return "alert";
  }
  return "watch";
}

function mapCondition(description: string): PagasaWeatherCondition {
  const value = description.toLowerCase();
  if (value.includes("monsoon")) return "monsoon-rain";
  if (value.includes("thunder")) return "thunderstorms";
  if (value.includes("rain shower") || value.includes("rainshower")) {
    return "rain-showers";
  }
  if (value.includes("rain")) return "rain";
  if (value.includes("partly cloudy")) return "partly-cloudy";
  if (value.includes("cloudy")) return "cloudy";
  return "sunny";
}

function rainfallOutlookFromForecast(forecast: string): string {
  const value = forecast.toLowerCase();
  if (value.includes("monsoon")) return "Monsoon rains";
  if (value.includes("thunder")) return "Thunderstorm activity";
  if (value.includes("scattered rain")) return "Scattered rains";
  if (value.includes("rain")) return "Rain expected";
  return "Isolated rain showers possible";
}

function estimateHeatIndex(tempMax: number): number | undefined {
  if (tempMax >= 32) return tempMax + 3;
  return undefined;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&deg;?/gi, "°")
    .replace(/\*\*/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseNumeric(value?: string): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function mapNcrFromMock(): PagasaNcrSummary {
  const mock = PAGASA_WEATHER_BULLETIN;
  const ncr = mock.regions.find((region) => region.id === "ncr");
  return {
    region: "Metro Manila (NCR)",
    temperature: ncr?.temperatureMax ?? 28,
    temperatureUnit: "°C",
    rainfall: 0,
    rainfallUnit: "mm/hr",
    windSpeed: 0,
    windUnit: "km/h",
    humidity: 0,
    condition: ncr?.forecast ?? "—",
    stormStatus: mock.advisories[0]?.headline ?? "Weather data unavailable",
    stormTone: "warning",
    updatedAt: mock.issuedAt,
  };
}

type PagasaRegionalPage = (typeof PAGASA_REGIONAL_PAGES)[number];
