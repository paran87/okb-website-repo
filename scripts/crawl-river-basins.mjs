/**
 * Crawl the public DPWH "18 Major River Basin MP/FS" Drive folders and write
 * a catalog the command center can render as webpages.
 *
 * Usage: node --use-system-ca scripts/crawl-river-basins.mjs
 */
import { writeFile } from "node:fs/promises";

const basins = [
  ["cagayan", "1bDk8UslNuoPoB2LrAP_aWyO6-CvDJAhv"],
  ["mindanao", "1v6cBH1L1JiDto_oBaxtK02FtHfU59SAs"],
  ["agusan", "1RwEsHoX_nRHyOZrN_7NRM7ZYWtTt64ga"],
  ["pampanga", "1FQ-UvOOFaQNLQLw_n05UmkebvE8KoRcJ"],
  ["agno", "1zH2lMFwtDCcu4awXeMYvBLDzAMKn2rry"],
  ["abra", "1eOzTA_hYLGbxxBBiWQZdDfWypQl_D5AC"],
  ["pasig-marikina", "1ohYGDcACbtvc3K_zN-FamfEUORUdQQl2"],
  ["bicol", "1ZBUcXoBt7Fx7IIAcQFfwPvVMQp4phgc7"],
  ["apayao-abulug", "12GlHNcwIOxV5OF-S6rqUcqPqIiKLI141"],
  ["tagum-libuganon", "1gQziL1JyPt4uZU6Sh6nrdLNlDFzmFamc"],
  ["ilog-hilabangan", "1NbDu-Ag6nTrykO3rFZycvJdJhzRCxYtn"],
  ["panay", "1xSC85Byefpmqh6Ob_x119veUbyjpLHFm"],
  ["tagoloan", "1deUjlV2YdcXzJmTBZyIZPfDYCrJ8c5Ae"],
  ["ranao-agus", "18b_O6k4xwAUoKf7y4y6lfQvQUbD5Uw08"],
  ["davao", "1XEutyljZLRMZi_uwJRQdUG2_z3eNuwX0"],
  ["cagayan-de-oro", "1VrD8idE88ntcCacjWbQ9Yd8pdPNgT0Y1"],
  ["jalaur", "18SsnNHukOrnmyKuD7wY7_oUBnbYl_Wr5"],
  ["buayan-malungon", "1LhpODF1w7dzWOj_R_3RZC5Ly-_wYf4b2"],
];

function parseEntries(html) {
  return html
    .split('class="flip-entry"')
    .slice(1)
    .map((chunk) => {
      const id = chunk.match(/id="entry-([^"]+)"/)?.[1];
      const href = chunk.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
      const title = chunk.match(/flip-entry-title">([^<]*)</)?.[1]?.trim();
      const isFolder =
        href?.includes("/folders/") ||
        chunk.includes("aria-label=\"Folder\"") ||
        chunk.includes("drive-sprite-folder");
      if (!id || !title) return null;
      return { id, title, kind: isFolder ? "folder" : "file" };
    })
    .filter(Boolean);
}

async function listFolder(id) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`);
  if (!res.ok) throw new Error(`folder ${id} ${res.status}`);
  return parseEntries(await res.text());
}

function tabFromName(name) {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  const feasibility = /feasib|fesib/.test(n) || /(?:^|[^a-z])fs(?:[^a-z]|$)/.test(n);
  const master = /master plan/.test(n) || /(?:^|[^a-z])mp(?:[^a-z]|$)/.test(n);
  if (feasibility && master) return "both";
  if (feasibility) return "feasibility";
  if (master) return "master-plan";
  return null;
}

function tabFromFile(title, inherited) {
  if (inherited && inherited !== "both") return inherited;
  const fromName = tabFromName(title);
  if (fromName && fromName !== "both") return fromName;
  if (inherited === "both" && fromName && fromName !== "both") return fromName;
  return inherited === "both" ? "both" : null;
}

async function walk(folderId, inheritedTab, edition, depth, seen) {
  if (depth > 6 || seen.has(folderId)) return [];
  seen.add(folderId);
  const entries = await listFolder(folderId);
  const docs = [];
  for (const entry of entries) {
    if (entry.kind === "folder") {
      const named = tabFromName(entry.title);
      const nextTab = named ?? inheritedTab;
      const nextEdition =
        named || /feasib|fesib|master plan/i.test(entry.title) ? edition : entry.title;
      docs.push(...(await walk(entry.id, nextTab, nextEdition, depth + 1, seen)));
      continue;
    }
    const tab = tabFromFile(entry.title, inheritedTab);
    docs.push({
      id: entry.id,
      title: entry.title.replace(/\.pdf$/i, ""),
      tab: tab ?? "unclassified",
      edition: edition ?? "Report",
    });
  }
  return docs;
}

const catalog = {};
for (const [slug] of basins) catalog[slug] = null;

for (const [slug, folderId] of basins) {
  const docs = await walk(folderId, null, null, 0, new Set());
  const feasibility = docs.filter((d) => d.tab === "feasibility" || d.tab === "both");
  const masterPlan = docs.filter((d) => d.tab === "master-plan" || d.tab === "both");
  const unclassified = docs.filter((d) => d.tab === "unclassified");
  catalog[slug] = {
    feasibility: feasibility.map(({ id, title, edition }) => ({ id, title, edition })),
    masterPlan: masterPlan.map(({ id, title, edition }) => ({ id, title, edition })),
    unclassified: unclassified.map(({ id, title, edition }) => ({ id, title, edition })),
  };
  console.error(
    `${slug}: FS ${feasibility.length}, MP ${masterPlan.length}, other ${unclassified.length}`,
  );
}

await writeFile(
  new URL("../lib/config/river-basin-documents.json", import.meta.url),
  `${JSON.stringify(catalog, null, 2)}\n`,
);
