/**
 * Edit keys of the reports sent from this phone (browser storage). The server returns a report's key once,
 * when it is sent; with it, only this phone can edit or delete that report.
 */

export interface MyReportKey {
  id: string;
  token: string;
  sentAt: string;
}

const KEY = "okb-flood-report-keys";
const MAX = 50;

export function readMyReportKeys(): MyReportKey[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw)
      ? raw.filter((k): k is MyReportKey => Boolean(k) && typeof k.id === "string" && typeof k.token === "string")
      : [];
  } catch {
    return [];
  }
}

function save(keys: MyReportKey[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(keys.slice(0, MAX)));
  } catch {
    /* private mode: the key lasts for this visit only */
  }
  window.dispatchEvent(new Event("okb-my-reports"));
}

export function addMyReportKey(id: string, token: string) {
  save([{ id, token, sentAt: new Date().toISOString() }, ...readMyReportKeys().filter((k) => k.id !== id)]);
}

export function removeMyReportKey(id: string) {
  save(readMyReportKeys().filter((k) => k.id !== id));
}

/** Forgets reports the server no longer has for this phone (deleted by OKB operators or from another tab). */
export function forgetMyReportKeys(ids: string[]) {
  if (!ids.length) return;
  const gone = new Set(ids);
  save(readMyReportKeys().filter((k) => !gone.has(k.id)));
}

export function myReportToken(id: string): string | null {
  return readMyReportKeys().find((k) => k.id === id)?.token ?? null;
}

/**
 * A private link that opens a report for editing in any browser or phone (when this browser's data is cleared,
 * or the report was sent from another browser). The key is after "#", so it never reaches a server in the URL.
 */
export function editLink(id: string, token: string): string {
  return `${window.location.origin}/report-flood#edit=${id}.${token}`;
}

/** The report id and edit key of an edit link ("#edit=<id>.<key>"), when the page was opened with one. */
export function readEditLink(hash: string): { id: string; token: string } | null {
  const m = /^#edit=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{32,128})$/i.exec(hash);
  return m ? { id: (m[1] as string).toLowerCase(), token: m[2] as string } : null;
}
