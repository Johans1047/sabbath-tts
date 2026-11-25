#!/usr/bin/env node
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getJson, quarterlyPath, lessonPath, dayPath } from "./api.mjs";
import { htmlToSegments } from "./clean.mjs";
import { createKokoro, splitSentences, SAMPLE_RATE } from "./kokoro.mjs";
import { concat, normalize, peakOf, encodeMp3 } from "./audio.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: node src/generate.mjs --quarter <id> [options]
  --quarter <id>     Quarter code, e.g. 2026-04-cq            (required)
  --lang <code>      Language code                            (default: es)
  --lesson <n|all>   Lesson number                            (default: all)
  --day <n|all>      Day number 1-7                           (default: all)
  --voice <name>     ef_dora | em_alex | em_santa             (default: ef_dora)
  --speed <x>        Speaking speed                           (default: 1)
  --verses <mode>    ref | text  (read verse text when the API has it) (default: ref)
  --out <dir>        Output directory                         (default: ./output)
  --kbps <n>         MP3 bitrate                              (default: 64)
  --dry-run          Only write the spoken scripts (.txt), no audio
  --force            Regenerate files that already exist`;

function parseArgs(argv) {
  const o = { lang: "es", lesson: "all", day: "all", voice: "em_alex", speed: 1, verses: "ref", out: join(ROOT, "output"), kbps: 64 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") o.dryRun = true;
    else if (a === "--force") o.force = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      if (!(key in o) && key !== "quarter") throw new Error(`Unknown option ${a}`);
      o[key] = argv[++i];
    } else throw new Error(`Unexpected argument ${a}`);
  }
  o.speed = Number(o.speed);
  o.kbps = Number(o.kbps);
  return o;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function parseDate(s) {
  const [d, m, y] = s.split("/").map(Number);
  return { iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, d, m, y, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

const PAUSE = { sentence: 0.25, heading: 0.8, text: 0.5, list: 0.4, verse: 0.5, question: 0.7, cue: 0.9, intro: 1.0 };

/** Ordered list of { text, after } speech units for one day. */
function buildUnits({ lessonNumber, lessonTitle, dayTitle, date, segments }) {
  const dt = parseDate(date);
  const stop = (t) => (/[.!?…]$/.test(t) ? t : `${t}.`); // titles like "¡Escuchen esto!" already end the sentence
  const intro = `Lección ${lessonNumber}. ${stop(lessonTitle)} ${WEEKDAYS[dt.weekday]} ${dt.d} de ${MONTHS[dt.m - 1]}. ${stop(dayTitle.toLowerCase())}`;
  const units = [{ type: "intro", text: intro }];
  for (const seg of segments) units.push(seg);
  return units;
}

const scriptText = (units) => units.map((u) => `[${u.type}] ${u.text}`).join("\n\n") + "\n";

async function fileSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.quarter) {
    console.log(USAGE);
    return;
  }
  if (!["ref", "text"].includes(opts.verses)) throw new Error(`--verses must be ref or text`);

  const cacheDir = join(ROOT, ".cache", "api");
  const quarterDir = join(opts.out, opts.quarter);
  await mkdir(quarterDir, { recursive: true });

  const q = await getJson(quarterlyPath(opts.lang, opts.quarter), { cacheDir });
  const wantedLessons = q.lessons.filter((l) => opts.lesson === "all" || Number(l.id) === Number(opts.lesson));
  if (!wantedLessons.length) throw new Error(`No lesson matches --lesson ${opts.lesson}`);
  console.log(`${q.quarterly.title} (${opts.quarter}) - ${wantedLessons.length} lesson(s), voice ${opts.voice}, verses ${opts.verses}${opts.dryRun ? " [dry-run]" : ""}`);

  // merge into an existing index so partial runs accumulate
  const indexFile = join(quarterDir, "index.json");
  let index;
  try {
    index = JSON.parse(await readFile(indexFile, "utf8"));
  } catch {
    index = null;
  }
  index = {
    quarter: { id: opts.quarter, lang: opts.lang, title: q.quarterly.title, start: parseDate(q.quarterly.start_date).iso, end: parseDate(q.quarterly.end_date).iso },
    sampleRate: SAMPLE_RATE,
    lessons: index?.lessons ?? [],
  };

  let engine = null;
  const getEngine = async () => (engine ??= await createKokoro({ voice: opts.voice, speed: opts.speed, cacheDir: join(ROOT, ".cache", "kokoro") }));

  // Every lesson and day goes into the index (days without audio have file: null) so a player can
  // show the whole quarter honestly; only the lessons/days asked for are generated.
  for (const l of q.lessons) {
    const isWanted = wantedLessons.includes(l);
    const lesson = await getJson(lessonPath(opts.lang, opts.quarter, l.id), { cacheDir });
    const entry = {
      id: l.id,
      title: l.title,
      start: parseDate(l.start_date).iso,
      end: parseDate(l.end_date).iso,
      days: [],
    };
    const previous = index.lessons.find((x) => x.id === l.id);

    const wantedDays = isWanted ? lesson.days.filter((d) => opts.day === "all" || Number(d.id) === Number(opts.day)) : [];
    for (const d of lesson.days) {
      const prev = previous?.days.find((x) => x.id === d.id);
      const placeholder = { id: d.id, title: d.title, date: parseDate(d.date).iso, file: null, data: `${l.id}/${d.id}.json` };
      if (!wantedDays.includes(d)) {
        entry.days.push(prev ?? placeholder);
        continue;
      }
      const rel = `${l.id}/${d.id}`;
      const txtPath = join(quarterDir, `${rel}.txt`);
      const jsonPath = join(quarterDir, `${rel}.json`);
      const mp3Path = join(quarterDir, `${rel}.mp3`);
      await mkdir(dirname(txtPath), { recursive: true });

      const settings = { voice: opts.voice, speed: opts.speed, verses: opts.verses, kbps: opts.kbps };
      const sameSettings = prev && JSON.stringify(prev.settings) === JSON.stringify(settings);
      if (!opts.force && !opts.dryRun && sameSettings && (await fileSize(mp3Path)) > 0) {
        console.log(`  ${rel} ${d.title}: up to date, skipped`);
        entry.days.push(prev);
        continue;
      }

      // A dry run must never overwrite the text/timings of a day that already has audio: they belong together.
      if (opts.dryRun && prev?.file) {
        console.log(`  ${rel} ${d.title}: has audio, left untouched`);
        entry.days.push({ ...prev, data: prev.data ?? `${rel}.json` });
        continue;
      }

      const day = await getJson(dayPath(opts.lang, opts.quarter, l.id, d.id), { cacheDir });
      const segments = htmlToSegments(day.content, { bible: day.bible, verses: opts.verses });
      const units = buildUnits({ lessonNumber: Number(l.id), lessonTitle: l.title, dayTitle: d.title, date: d.date, segments });
      await writeFile(txtPath, scriptText(units), "utf8");
      const chars = units.reduce((n, u) => n + u.text.length, 0);
      // Per-day data for players: typed segments, with start/end seconds once audio exists.
      const dayData = (segs, durationSec) => ({
        lesson: { id: l.id, title: l.title },
        day: { id: d.id, title: d.title, date: parseDate(d.date).iso },
        durationSec,
        segments: segs,
      });
      await writeFile(jsonPath, JSON.stringify(dayData(units, null), null, 1), "utf8");

      if (opts.dryRun) {
        console.log(`  ${rel} ${d.title}: script written (${units.length} units, ${chars} chars)`);
        entry.days.push(prev ? { ...prev, data: prev.data ?? `${rel}.json` } : placeholder);
        continue;
      }

      const tts = await getEngine();
      const started = Date.now();
      const parts = [];
      const timed = [];
      let t = 0;
      let chunks = 0;
      const add = (p) => {
        parts.push(p);
        t += p.silence ?? p.length / SAMPLE_RATE;
      };
      for (const u of units) {
        const start = t;
        if (u.type === "cue") add({ silence: 0.4 });
        for (const sentence of splitSentences(u.text)) {
          add(await tts.synth(sentence));
          add({ silence: PAUSE.sentence });
          chunks++;
        }
        add({ silence: PAUSE[u.type] ?? 0.5 });
        timed.push({ ...u, start: +start.toFixed(2), end: +t.toFixed(2) });
      }
      const samples = normalize(concat(parts));
      const peak = peakOf(samples);
      const seconds = samples.length / SAMPLE_RATE;
      if (peak < 0.05 || seconds < 5) throw new Error(`${rel}: suspicious audio (peak ${peak}, ${seconds}s)`);
      const mp3 = encodeMp3(samples, { kbps: opts.kbps });
      await writeFile(mp3Path, mp3);
      await writeFile(jsonPath, JSON.stringify(dayData(timed, Math.round(seconds)), null, 1), "utf8");

      const took = (Date.now() - started) / 1000;
      console.log(`  ${rel} ${d.title}: ${chunks} chunks, ${seconds.toFixed(0)} s audio, ${(mp3.length / 1e6).toFixed(1)} MB, ${took.toFixed(0)} s (x${(seconds / took).toFixed(1)} realtime)`);
      entry.days.push({
        id: d.id,
        title: d.title,
        date: parseDate(d.date).iso,
        file: `${rel}.mp3`,
        script: `${rel}.txt`,
        data: `${rel}.json`,
        durationSec: Math.round(seconds),
        bytes: mp3.length,
        settings,
      });
    }
    index.lessons = [...index.lessons.filter((x) => x.id !== l.id), entry].sort((a, b) => a.id.localeCompare(b.id));
    await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
  }
  console.log(`index: ${indexFile}`);
  await writeCatalog(opts.out);
}

/** out/catalog.json lists every quarter folder so a player can offer any of them. */
async function writeCatalog(outDir) {
  const quarters = [];
  for (const entry of await readdir(outDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const idx = JSON.parse(await readFile(join(outDir, entry.name, "index.json"), "utf8"));
      quarters.push({ id: idx.quarter.id, title: idx.quarter.title, start: idx.quarter.start, end: idx.quarter.end, lang: idx.quarter.lang });
    } catch {
      /* not a quarter folder */
    }
  }
  quarters.sort((a, b) => b.start.localeCompare(a.start));
  await writeFile(join(outDir, "catalog.json"), JSON.stringify({ quarters }, null, 2), "utf8");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
