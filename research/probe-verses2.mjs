import { readFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const read = (id) => JSON.parse(readFileSync(`${here}api-samples/read-day${id}.json`, "utf8"));

const d4 = read("04");
for (const [k, v] of Object.entries(d4.bible[0].verses)) console.log(k, "=>", v.slice(0, 100).replace(/\s+/g, " "));

const d1 = read("01");
const refs = [...d1.content.matchAll(/verse="([^"]+)"/g)].map((m) => m[1]);
console.log("\nday1 duplicate refs:", refs.filter((r, i) => refs.indexOf(r) !== i));
console.log("\nday1 start:\n" + d1.content.slice(0, 1100));
