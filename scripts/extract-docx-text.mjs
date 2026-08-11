import fs from "fs";
import path from "path";

const xmlPath = path.resolve("deos-extract/word/document.xml");
const outPath = path.resolve("deos-extract/text-output.txt");

const xml = fs.readFileSync(xmlPath, "utf8");
const texts = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
fs.writeFileSync(outPath, texts.join("\n"), "utf8");
console.log(`Extracted ${texts.length} text nodes`);
