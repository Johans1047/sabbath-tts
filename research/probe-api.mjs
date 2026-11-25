import { writeFileSync } from "node:fs";

const base = "https://sabbath-school.adventech.io/api/v2/es/quarterlies/2026-04-cq/lessons/04";
const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const day = await (await fetch(`${base}/days/index.json`)).json();
console.log("title enc check:", JSON.stringify(day.map?.((d) => d.title) ?? Object.keys(day)));

const res = await fetch(`${base}/days/02/read/index.json`, { headers: { Origin: "http://localhost:5173" } });
console.log("read status:", res.status, "| ACAO:", res.headers.get("access-control-allow-origin"), "| content-type:", res.headers.get("content-type"));
const body = await res.json();
console.log("read keys:", Object.keys(body));
writeFileSync(`${out}read-day02.json`, JSON.stringify(body, null, 2));
console.log("content length:", body.content?.length);
console.log((body.content ?? "").slice(0, 1500));
