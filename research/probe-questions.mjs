import { readFileSync } from "node:fs";

const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

for (let i = 1; i <= 7; i++) {
  const id = String(i).padStart(2, "0");
  const d = JSON.parse(readFileSync(`${out}read-day${id}.json`, "utf8"));
  console.log(`\n=== ${id} ${d.title} (${d.date}) ===`);
  const codes = [...d.content.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((m) => m[1].trim());
  console.log("code blocks:", JSON.stringify(codes));
  const ends = d.content.trim().slice(-450);
  console.log("tail:", ends);
  const verses = Object.keys(d.bible?.[0]?.verses ?? {});
  const refs = [...d.content.matchAll(/verse="([^"]+)"/g)].map((m) => m[1]);
  console.log("verse refs in text:", refs.length, "| in bible map:", verses.length, "| missing:", refs.flatMap((r) => r.split(",")).filter((k) => !verses.includes(k)));
}
