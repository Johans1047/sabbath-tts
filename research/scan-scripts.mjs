// Scan every generated day script (output/<quarter>/<lesson>/<day>.json) for things that read badly aloud or render badly.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../output/2026-04-cq/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const checks = [
  ["digits left", /\d/],
  ["undefined/null/NaN", /\b(undefined|null|NaN)\b/],
  ["leftover brackets/braces", /[\[\]{}<>]/],
  ["double punctuation", /[.,;:!?]{2,}(?<!\.\.\.)/],
  ["space before punctuation", /\s[.,;:!?]/],
  ["ALL-CAPS word", /\b[A-ZÁÉÍÓÚÑ]{4,}\b/],
  ["url or @", /https?:|www\.|@/],
  ["raw abbreviation", /\b(pp?|cap|caps|vol|Ed|cf|etc|ej|pág|págs)\.(?=\s|$)/],
  ["verse-ish leftover", /\d+:\d+/],
  ["entity", /&[a-z#0-9]+;/i],
];

const found = {};
let days = 0, segs = 0, longest = { len: 0 };
const typeCount = {};
for (const lesson of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const f of readdirSync(join(root, lesson.name)).filter((n) => n.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(join(root, lesson.name, f), "utf8"));
    days++;
    const key = `${lesson.name}/${f.replace(".json", "")}`;
    const total = data.segments.reduce((n, s) => n + s.text.length, 0);
    if (total < 600) (found["very short day (<600 chars)"] ??= []).push(`${key} (${total})`);
    for (const s of data.segments) {
      segs++;
      typeCount[s.type] = (typeCount[s.type] ?? 0) + 1;
      if (s.text.length > longest.len) longest = { len: s.text.length, key, type: s.type };
      if (s.type !== "intro" && s.text.length > 1500) (found["segment > 1500 chars"] ??= []).push(`${key} ${s.type} (${s.text.length})`);
      for (const [name, re] of checks) {
        if (s.type === "intro" && name === "digits left") continue;
        const m = s.text.match(re);
        if (m) (found[name] ??= []).push(`${key} [${s.type}] …${s.text.slice(Math.max(0, m.index - 25), m.index + 35).replace(/\n/g, " ")}…`);
      }
    }
    if (!data.segments.some((s) => s.type !== "intro")) (found["no body"] ??= []).push(key);
  }
}
console.log(`days: ${days}, segments: ${segs}, longest segment: ${longest.len} chars (${longest.key}, ${longest.type})`);
console.log("types:", JSON.stringify(typeCount));
for (const [name, list] of Object.entries(found)) {
  console.log(`\n== ${name}: ${list.length} ==`);
  list.slice(0, 6).forEach((l) => console.log("  " + l));
}
if (!Object.keys(found).length) console.log("\nno findings");
