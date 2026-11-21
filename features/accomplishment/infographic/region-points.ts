/**
 * Where each region's marker sits on the infographic map (longitude, latitude near the middle of the region,
 * nudged apart where regions crowd together), keyed by region token (regionToken in lib/rollup.ts).
 */
export const REGION_POINTS: Record<string, [number, number]> = {
  I: [120.3, 17.35],
  CAR: [121.0, 17.05],
  II: [121.75, 17.45],
  III: [120.65, 15.45],
  NCR: [121.05, 14.6],
  "IV-A": [121.55, 14.05],
  MIMAROPA: [121.0, 12.85],
  "IV-B": [121.0, 12.85],
  V: [123.45, 13.45],
  VI: [122.45, 11.15],
  NIR: [122.95, 10.05],
  VII: [123.9, 10.35],
  VIII: [124.95, 11.6],
  IX: [122.55, 7.85],
  X: [124.65, 8.35],
  XIII: [125.85, 8.95],
  XI: [125.85, 7.15],
  BARMM: [124.15, 7.45],
  XII: [124.75, 6.45],
};
