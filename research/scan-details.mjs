import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../output/2026-04-cq/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const caps = new Map();
const dbl = new Map();
const abbr = new Map();
for (const lesson of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const f of readdirSync(join(root, lesson.name)).filter((n) => n.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(join(root, lesson.name, f), "utf8"));
    for (const s of data.segments) {
      if (s.type === "intro") continue;
      for (const m of s.text.matchAll(/\b[A-ZÁÉÍÓÚÑ]{3,}\b/g)) caps.set(m[0], (caps.get(m[0]) ?? 0) + 1);
      for (const m of s.text.matchAll(/.{0,22}[.,;:!?]{2,}.{0,12}/g)) if (!/\.\.\./.test(m[0])) dbl.set(m[0], (dbl.get(m[0]) ?? 0) + 1);
      // lowercase abbreviations like "d. C.", "eds.", "ed.", "trad." and single-letter initials mid-sentence
      for (const m of s.text.matchAll(/\b(?:[a-zñ]{1,5}\.(?:\s?[A-Z]\.)?)(?=[\s,;)])/g)) {
        if (/^(?:etc|pp?|cap|caps)\./.test(m[0])) continue;
        abbr.set(m[0], (abbr.get(m[0]) ?? 0) + 1);
      }
    }
  }
}
const show = (name, map) => console.log(`\n${name}:\n` + [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `  ${v}x ${JSON.stringify(k)}`).join("\n"));
show("ALL-CAPS", caps);
show("double punctuation", dbl);
show("short lowercase abbreviations", abbr);
