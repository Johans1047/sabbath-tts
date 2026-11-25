// Sanity check of a generated day: files, MP3 header/size vs duration, timing monotonicity, index entry.
import { readFileSync, statSync } from "node:fs";

const [lesson = "04", day = "01"] = process.argv.slice(2);
const root = new URL("../output/2026-04-cq/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const mp3 = `${root}${lesson}/${day}.mp3`;
const json = JSON.parse(readFileSync(`${root}${lesson}/${day}.json`, "utf8"));
const index = JSON.parse(readFileSync(`${root}index.json`, "utf8"));

const size = statSync(mp3).size;
const head = readFileSync(mp3).subarray(0, 4);
const entry = index.lessons.find((l) => l.id === lesson)?.days.find((d) => d.id === day);
console.log(`mp3: ${size} bytes, header ${[...head].map((b) => b.toString(16).padStart(2, "0")).join(" ")}`);
console.log(`index entry: durationSec=${entry?.durationSec}, bytes=${entry?.bytes}, voice=${entry?.settings?.voice}, data=${entry?.data}`);
console.log(`expected size at 64 kbps for ${entry?.durationSec}s: ~${Math.round((entry?.durationSec ?? 0) * 8000)} bytes`);

const segs = json.segments;
const timed = segs.every((s) => typeof s.start === "number" && typeof s.end === "number");
let monotonic = true;
for (let i = 1; i < segs.length; i++) if (segs[i].start < segs[i - 1].end - 0.01) monotonic = false;
console.log(`segments: ${segs.length}, all timed: ${timed}, monotonic: ${monotonic}`);
if (timed) console.log(`first start ${segs[0].start}s, last end ${segs.at(-1).end}s (json durationSec ${json.durationSec})`);
console.log("types in order:", segs.map((s) => s.type[0]).join(""));
const longest = segs.reduce((a, s) => (s.end - s.start > a.len ? { len: s.end - s.start, type: s.type } : a), { len: 0 });
console.log(`longest segment: ${longest.len.toFixed(1)}s (${longest.type})`);
