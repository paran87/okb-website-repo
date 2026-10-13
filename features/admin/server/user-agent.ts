/** Small user-agent parser for visit analytics (device class, browser and OS names only). */

export interface ParsedAgent {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
}

const BOT =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegrambot|discordbot|preview|headless|lighthouse|pagespeed|vercel|uptime|monitor|curl|wget|python|go-http|axios|node-fetch|postman/i;

export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua);
}

function browserOf(ua: string): string {
  if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/fban|fbav|fb_iab/i.test(ua)) return "Facebook app";
  if (/instagram/i.test(ua)) return "Instagram app";
  if (/line\//i.test(ua)) return "LINE app";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios|crmo/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function osOf(ua: string): string {
  if (/iphone|ipod/i.test(ua)) return "iOS";
  if (/ipad/i.test(ua)) return "iPadOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function deviceOf(ua: string): ParsedAgent["device"] {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

export function parseAgent(ua: string): ParsedAgent {
  return { device: deviceOf(ua), browser: browserOf(ua), os: osOf(ua) };
}
