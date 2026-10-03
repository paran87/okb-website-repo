/**
 * Helpers for embedding Google Apps Script web apps. The public /exec URL is
 * often blocked in iframes (X-Frame-Options). The actual UI lives in a
 * googleusercontent.com/userCodeAppPanel document that can be embedded.
 */
export function extractUserCodeAppPanelUrl(html: string): string | null {
  const direct = html.match(/el\.src\s*=\s*'([^']+userCodeAppPanel)'/);
  if (direct?.[1]) {
    return unescapeAppsScriptUrl(direct[1]);
  }

  const hostMatch = html.match(
    /sandboxHost\\":\\"(https:\\\\[^\\]+googleusercontent\.com)\\"/,
  );
  if (hostMatch?.[1]) {
    return `${unescapeAppsScriptUrl(hostMatch[1])}/userCodeAppPanel`;
  }

  const jsonHost = html.match(
    /"sandboxHost":"(https:\/\/[^"]+googleusercontent\.com)"/,
  );
  if (jsonHost?.[1]) {
    return `${jsonHost[1]}/userCodeAppPanel`;
  }

  return null;
}

function unescapeAppsScriptUrl(value: string): string {
  return value.replace(/\\\//g, "/");
}
