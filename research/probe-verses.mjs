import { readFileSync } from "node:fs";
const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
for (let i = 1; i <= 7; i++) {
  const id = String(i).padStart(2, "0");
  const d = JSON.parse(readFileSync(`${out}read-day${id}.json`, "utf8"));
  const map = d.bible?.[0]?.verses ?? {};
  const refs = [...d.content.matchAll(/verse="([^"]+)"/g)].map((m) => m[1]);
  const miss = refs.filter((r) => !(r in map));
  console.log(id, "refs:", refs.length, "map keys:", Object.keys(map).length, "missing full-key:", JSON.stringify(miss));
}
