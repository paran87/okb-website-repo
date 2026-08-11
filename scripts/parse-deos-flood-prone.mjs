import fs from "fs";
import path from "path";

const xmlPath = path.resolve("deos-extract/word/document.xml");
const outJson = path.resolve("features/flood-prone/data/deos-flood-prone-raw.json");

const xml = fs.readFileSync(xmlPath, "utf8");

function extractParagraphs(docXml) {
  const paragraphs = [];
  for (const block of docXml.split(/<w:p[\s>]/).slice(1)) {
    const segment = block.split("</w:p>")[0] ?? "";
    const texts = [...segment.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(
      (m) => m[1],
    );
    const line = texts.join("").replace(/\s+/g, " ").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs;
}

const DEO_HEADERS = new Set([
  "North Manila",
  "South Manila",
  "Quezon City 1st",
  "Quezon City 2nd",
  "Metro Manila 1st",
  "Metro Manila 2nd",
  "Metro Manila 3rd",
  "Las Piñas - Muntinlupa",
  "Malabon - Navotas",
]);

const paragraphs = extractParagraphs(xml);
const entries = [];
let currentDeo = "NCR";
let pendingIndex = null;
let autoIndex = 0;

function pushEntry(index, description) {
  autoIndex = Math.max(autoIndex, index);
  entries.push({
    id: `fpa-${currentDeo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${index}`,
    deo: currentDeo,
    index,
    description: description.replace(/&apos;/g, "'").trim(),
  });
}

for (const line of paragraphs) {
  if (
    line.startsWith("as of:") ||
    line.startsWith("REGION:") ||
    line.includes("ROAD SECTION") ||
    line.startsWith("(Road Section")
  ) {
    continue;
  }
  if (line === "DEOs" || line === "NCR") continue;

  if (DEO_HEADERS.has(line)) {
    currentDeo = line;
    pendingIndex = null;
    autoIndex = 0;
    continue;
  }

  const numberOnly = line.match(/^(\d+)\.?$/);
  if (numberOnly) {
    pendingIndex = Number(numberOnly[1]);
    continue;
  }

  const inline = line.match(/^(\d+)\.?\s+(.+)/);
  if (inline) {
    pushEntry(Number(inline[1]), inline[2]);
    pendingIndex = null;
    continue;
  }

  if (pendingIndex !== null) {
    pushEntry(pendingIndex, line);
    pendingIndex = null;
    continue;
  }

  // Unnumbered entry within a DEO block (e.g. Quezon City 2nd tail entries)
  if (currentDeo !== "NCR" && line.includes("(") || line.match(/\b(Road|Ave|Blvd|Street|St\.|Highway|EDSA)\b/i)) {
    autoIndex += 1;
    pushEntry(autoIndex, line);
  }
}

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(entries, null, 2), "utf8");

const counts = entries.reduce((m, e) => {
  m.set(e.deo, (m.get(e.deo) ?? 0) + 1);
  return m;
}, new Map());

console.log(`Parsed ${entries.length} flood-prone areas`);
console.log("DEO counts:", Object.fromEntries(counts));
