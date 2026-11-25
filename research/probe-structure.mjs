import { writeFileSync } from "node:fs";

const base = "https://sabbath-school.adventech.io/api/v2/es/quarterlies/2026-04-cq/lessons/04";
const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

for (let i = 1; i <= 7; i++) {
  const id = String(i).padStart(2, "0");
  const d = await (await fetch(`${base}/days/${id}/read/index.json`)).json();
  writeFileSync(`${out}read-day${id}.json`, JSON.stringify(d, null, 2));
  const tags = {};
  for (const m of d.content.matchAll(/<([a-z0-9]+)[\s>]/gi)) tags[m[1]] = (tags[m[1]] ?? 0) + 1;
  const classes = [...new Set([...d.content.matchAll(/class="([^"]+)"/g)].map((m) => m[1]))];
  console.log(id, `"${d.title}"`, "chars:", d.content.length, "tags:", JSON.stringify(tags), "classes:", classes.join("|"));
  console.log("   bible:", Array.isArray(d.bible) ? `${d.bible.length} entries` : typeof d.bible);
}

const d2 = JSON.parse((await import("node:fs")).readFileSync(`${out}read-day02.json`, "utf8"));
console.log("\nbible sample:", JSON.stringify(d2.bible, null, 1).slice(0, 900));
