import { weather, type WeatherId } from "./options";

/**
 * How long a flood reported from the OKB mobile page stays on the maps when nobody reports that it receded:
 * 2–3 hours in dry weather, 4–6 hours in rain, by the weather the sender chose. If PAGASA measures rain or has
 * a warning for Metro Manila now, a report sent in dry weather stays at least 4 hours (the rain came after it).
 * A report that gives the time the flood receded leaves the map at that time.
 */
export const MOBILE_EXPIRY_HOURS: Record<WeatherId, number> = {
  clear: 2,
  cloudy: 3,
  light_rain: 4,
  moderate_rain: 5,
  heavy_rain: 6,
  torrential_rain: 6,
  thunderstorm: 6,
};

/** Rain now (PAGASA) keeps a dry-weather report at least this long. */
export const LIVE_RAIN_MIN_HOURS = 4;

/** The longest any mobile report stays (how far back the maps need to read). */
export const MOBILE_EXPIRY_MAX_HOURS = 6;

export function mobileExpiryHours(weatherId: string | null | undefined, liveRain: boolean): number {
  const reported = weather(weatherId) ? MOBILE_EXPIRY_HOURS[weatherId as WeatherId] : 3;
  return liveRain ? Math.max(reported, LIVE_RAIN_MIN_HOURS) : reported;
}

/** "6 h (heavy rain)" / "4 h (rain now in Metro Manila)": why a report clears when it does. */
export function expiryReason(weatherId: string | null | undefined, liveRain: boolean): string {
  const hours = mobileExpiryHours(weatherId, liveRain);
  const label = weather(weatherId)?.label.toLowerCase() ?? "weather not given";
  const raisedByRain = liveRain && hours > (weather(weatherId) ? MOBILE_EXPIRY_HOURS[weatherId as WeatherId] : 3);
  return `${hours} h (${raisedByRain ? "rain now in Metro Manila" : label})`;
}
