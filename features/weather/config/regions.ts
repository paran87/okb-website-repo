import type { PagasaIslandGroup } from "@/features/weather/types";

export interface PagasaRegionalPage {
  id: string;
  slug: string;
  region: string;
  areaLabel: string;
  islandGroup: PagasaIslandGroup;
}

/** PAGASA public regional forecast pages — Philippines coverage. */
export const PAGASA_REGIONAL_PAGES: readonly PagasaRegionalPage[] = [
  {
    id: "ncr",
    slug: "national-capital-region",
    region: "National Capital Region",
    areaLabel: "Metro Manila",
    islandGroup: "luzon",
  },
  {
    id: "northern-luzon",
    slug: "northern-luzon",
    region: "Northern Luzon",
    areaLabel: "Ilocos, Cagayan Valley, Cordillera",
    islandGroup: "luzon",
  },
  {
    id: "southern-luzon",
    slug: "southern-luzon",
    region: "Southern Luzon",
    areaLabel: "CALABARZON, Bicol, MIMAROPA",
    islandGroup: "luzon",
  },
  {
    id: "visayas",
    slug: "visayas",
    region: "Visayas",
    areaLabel: "Western, Central & Eastern Visayas",
    islandGroup: "visayas",
  },
  {
    id: "mindanao",
    slug: "mindanao",
    region: "Mindanao",
    areaLabel: "Northern, Southern & Bangsamoro",
    islandGroup: "mindanao",
  },
] as const;

export const PAGASA_HOME_URL = "https://www.pagasa.dost.gov.ph/";
export const PAGASA_TENDAY_ISSUANCE_URL =
  "https://tenday.pagasa.dost.gov.ph/api/v1/tenday/issuance";
