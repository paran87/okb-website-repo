/**
 * Apps Script serves the web app from script.google.com and then renders the
 * user code in a sandboxed frame on script.googleusercontent.com, so a cold
 * load pays for two separate connections.
 */
export const DASHBOARD_ORIGINS = [
  "https://script.google.com",
  "https://script.googleusercontent.com",
] as const;
