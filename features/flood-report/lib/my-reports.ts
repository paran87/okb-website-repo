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

export function myReportToken(id: string): string | null {
  return readMyReportKeys().find((k) => k.id === id)?.token ?? null;
}
