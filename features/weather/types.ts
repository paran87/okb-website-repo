/** PAGASA-style weather condition for public forecast display. */
export type PagasaWeatherCondition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain-showers"
  | "rain"
  | "thunderstorms"
  | "monsoon-rain";

export type PagasaAdvisoryLevel = "watch" | "warning" | "alert" | "signal";

export type PagasaIslandGroup = "luzon" | "visayas" | "mindanao";

export interface PagasaRegionalForecast {
  id: string;
  region: string;
  areaLabel: string;
  islandGroup: PagasaIslandGroup;
  condition: PagasaWeatherCondition;
  temperatureMin: number;
  temperatureMax: number;
  heatIndex?: number;
  rainfallOutlook: string;
  wind: string;
  coastalWaters: string;
  forecast: string;
}

export interface PagasaWeatherAdvisory {
  id: string;
  type: string;
  level: PagasaAdvisoryLevel;
  headline: string;
  areas: string;
  validUntil: string;
  detail: string;
}

export interface PagasaWeatherBulletin {
  issuedAt: string;
  validPeriod: string;
  synopticSituation: string;
  generalForecast: string;
  advisories: PagasaWeatherAdvisory[];
  regions: PagasaRegionalForecast[];
}

/** Live bulletin payload returned by the weather API. */
export interface PagasaWeatherBulletinResponse extends PagasaWeatherBulletin {
  fetchedAt: string;
  source: "pagasa-live" | "fallback";
  ncrObservation?: PagasaNcrSummary;
}

/** Compact NCR observation for dashboard and header widgets. */
export interface PagasaNcrSummary {
  region: string;
  temperature: number;
  temperatureUnit: string;
  rainfall: number;
  rainfallUnit: string;
  windSpeed: number;
  windUnit: string;
  humidity: number;
  condition: string;
  stormStatus: string;
  stormTone: "normal" | "warning" | "critical" | "success";
  updatedAt: string;
  heatIndex?: number;
}
