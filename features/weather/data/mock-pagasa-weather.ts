import type { PagasaWeatherBulletin } from "@/features/weather/types";

/** Mock DOST-PAGASA-style bulletin — Philippines coverage only. */
export const PAGASA_WEATHER_BULLETIN: PagasaWeatherBulletin = {
  issuedAt: "4:00 PM PHT, 18 August 2026",
  validPeriod: "18 August 2026 (6:00 PM) – 19 August 2026 (6:00 PM)",
  synopticSituation:
    "The enhanced southwest monsoon (habagat) is affecting the western sections of Luzon and Visayas. At 3:00 PM today, the low pressure area was estimated at 390 km west of Iba, Zambales. Metro Manila, Central Luzon, CALABARZON, and MIMAROPA will experience monsoon rains. The rest of the country will have partly cloudy to cloudy skies with isolated rain showers or thunderstorms.",
  generalForecast:
    "Flooding and rain-induced landslides are possible in areas that are highly or very highly susceptible during heavy rainfall. Localized thunderstorms may bring moderate to heavy rains over short periods. All information below applies to the Philippines only.",
  advisories: [
    {
      id: "adv-001",
      type: "Heavy Rainfall Warning",
      level: "warning",
      headline: "Orange Warning — Metro Manila & Rizal",
      areas: "Metro Manila, Rizal (General Nakar, Tanay, Antipolo)",
      validUntil: "8:00 PM PHT today",
      detail:
        "Moderate to heavy rains affecting flood-prone and low-lying areas. Expect possible flooding in urban centers and near waterways.",
    },
    {
      id: "adv-002",
      type: "Thunderstorm Advisory",
      level: "alert",
      headline: "Thunderstorm Advisory No. 7",
      areas: "Quezon City, Marikina, Pasig, Taguig, Muntinlupa, Cavite",
      validUntil: "5:30 PM PHT today",
      detail:
        "Moderate to heavy rain showers with lightning and strong winds are expected within the next 1–2 hours.",
    },
    {
      id: "adv-003",
      type: "General Flood Advisory",
      level: "watch",
      headline: "GFA — Pampanga River Basin",
      areas: "Pampanga, Bulacan, Nueva Ecija (low-lying communities)",
      validUntil: "6:00 AM PHT tomorrow",
      detail:
        "River systems may reach alert levels due to sustained monsoon rainfall upstream.",
    },
  ],
  regions: [
    {
      id: "ncr",
      region: "National Capital Region",
      areaLabel: "Metro Manila",
      islandGroup: "luzon",
      condition: "monsoon-rain",
      temperatureMin: 24,
      temperatureMax: 29,
      heatIndex: 35,
      rainfallOutlook: "Moderate to heavy rains",
      wind: "SW 30–45 km/h",
      coastalWaters: "Moderate to rough",
      forecast:
        "Monsoon rains. Flooding and landslides possible in susceptible areas. Nighttime rains may persist along the Marikina and Pasig river corridors.",
    },
    {
      id: "northern-luzon",
      region: "Northern Luzon",
      areaLabel: "Ilocos, Cagayan Valley, Cordillera",
      islandGroup: "luzon",
      condition: "rain-showers",
      temperatureMin: 23,
      temperatureMax: 31,
      rainfallOutlook: "Light to moderate rains",
      wind: "SW 20–35 km/h",
      coastalWaters: "Moderate",
      forecast:
        "Cloudy skies with scattered rain showers and thunderstorms. Isolated heavy rains during thunderstorms.",
    },
    {
      id: "central-luzon",
      region: "Central Luzon",
      areaLabel: "Central Luzon & MIMAROPA",
      islandGroup: "luzon",
      condition: "rain",
      temperatureMin: 24,
      temperatureMax: 30,
      rainfallOutlook: "Moderate to heavy rains",
      wind: "SW 35–50 km/h",
      coastalWaters: "Rough",
      forecast:
        "Monsoon rains over Zambales, Bataan, and western Pangasinan. Cloudy with rains over the rest of the region.",
    },
    {
      id: "southern-luzon",
      region: "Southern Luzon",
      areaLabel: "Bicol Region & CALABARZON",
      islandGroup: "luzon",
      condition: "cloudy",
      temperatureMin: 25,
      temperatureMax: 32,
      rainfallOutlook: "Isolated rain showers",
      wind: "S 15–30 km/h",
      coastalWaters: "Slight to moderate",
      forecast:
        "Partly cloudy to cloudy with isolated rain showers or thunderstorms, especially in the afternoon and evening.",
    },
    {
      id: "visayas",
      region: "Visayas",
      areaLabel: "Western & Central Visayas",
      islandGroup: "visayas",
      condition: "partly-cloudy",
      temperatureMin: 26,
      temperatureMax: 33,
      rainfallOutlook: "Isolated rain showers",
      wind: "SW 20–35 km/h",
      coastalWaters: "Moderate",
      forecast:
        "Western Visayas: cloudy with monsoon rains. The rest of Visayas: partly cloudy with localized thunderstorms.",
    },
    {
      id: "mindanao",
      region: "Mindanao",
      areaLabel: "Northern & Eastern Mindanao",
      islandGroup: "mindanao",
      condition: "partly-cloudy",
      temperatureMin: 25,
      temperatureMax: 34,
      rainfallOutlook: "Isolated rain showers",
      wind: "S 10–25 km/h",
      coastalWaters: "Slight to moderate",
      forecast:
        "Partly cloudy to cloudy with isolated rain showers or thunderstorms. Mindanao remains generally warm and humid.",
    },
  ],
};
