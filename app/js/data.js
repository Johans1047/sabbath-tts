// Data access and the small pure helpers around it. Audio and JSON live under ./audio/ (see src/serve.mjs).

export const audioUrl = (quarterId, file) => `audio/${quarterId}/${file}`;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
  return res.json();
}

export const loadCatalog = () => getJSON("audio/catalog.json");
export const loadQuarter = (id) => getJSON(`audio/${id}/index.json`);
export const loadDay = (quarterId, day) => (day.data ? getJSON(`audio/${quarterId}/${day.data}`) : Promise.resolve(null));

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const INITIALS = ["D", "L", "M", "M", "J", "V", "S"];

const parts = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const longDate = (iso) => {
  const p = parts(iso);
  return `${cap(WEEKDAYS[p.weekday])} ${p.d} de ${MONTHS[p.m - 1]}`;
};
export const shortRange = (a, b) => {
  const pa = parts(a);
  const pb = parts(b);
  return pa.m === pb.m ? `${pa.d}–${pb.d} ${MONTHS[pb.m - 1]}` : `${pa.d} ${MONTHS[pa.m - 1].slice(0, 3)} – ${pb.d} ${MONTHS[pb.m - 1].slice(0, 3)}`;
};
export const weekdayInitial = (iso) => INITIALS[parts(iso).weekday];
export const dayOfMonth = (iso) => parts(iso).d;
export const weekdayName = (iso) => cap(WEEKDAYS[parts(iso).weekday]);

export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Where to open: today's day if it is in the quarter, otherwise the nearest edge. */
export function pickToday(quarter, iso = todayIso()) {
  const all = quarter.lessons.flatMap((l) => l.days.map((d) => ({ lesson: l, day: d })));
  const hit = all.find((x) => x.day.date === iso);
  if (hit) return { lessonId: hit.lesson.id, dayId: hit.day.id, isToday: true };
  const edge = iso < quarter.quarter.start ? all[0] : all.at(-1);
  return { lessonId: edge.lesson.id, dayId: edge.day.id, isToday: false };
}

export function fmtClock(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function fmtMinutes(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m} min${s ? ` ${s} s` : ""}` : `${s} s`;
}

// Same pauses the generator inserts (src/generate.mjs), used only to estimate timings.
const PAUSE = { sentence: 0.25, heading: 0.8, text: 0.5, list: 0.4, verse: 0.5, question: 0.7, cue: 0.9, intro: 1.0 };

/**
 * Start/end second of every segment. Exact when the generator stored timings;
 * otherwise estimated from text length (speech time is proportional to characters).
 */
export function timeline(segments, duration) {
  if (segments.length && segments.every((s) => typeof s.start === "number")) {
    return { spans: segments.map((s) => ({ start: s.start, end: s.end })), estimated: false };
  }
  if (!duration) return { spans: null, estimated: true };
  const pauses = segments.map((s) => (s.text.match(/[.!?…]+(\s|$)/g)?.length ?? 1) * PAUSE.sentence + (PAUSE[s.type] ?? 0.5) + (s.type === "cue" ? 0.4 : 0));
  const totalPause = pauses.reduce((a, b) => a + b, 0);
  const totalChars = segments.reduce((a, s) => a + s.text.length, 0) || 1;
  const speech = Math.max(duration - totalPause, duration * 0.5);
  let t = 0;
  const spans = segments.map((s, i) => {
    const len = (speech * s.text.length) / totalChars + pauses[i];
    const span = { start: t, end: t + len };
    t += len;
    return span;
  });
  const scale = duration / t;
  spans.forEach((sp) => {
    sp.start *= scale;
    sp.end *= scale;
  });
  return { spans, estimated: true };
}

export function activeSegment(spans, t) {
  if (!spans) return -1;
  for (let i = 0; i < spans.length; i++) if (t >= spans[i].start && t < spans[i].end) return i;
  return t >= (spans.at(-1)?.end ?? Infinity) ? spans.length - 1 : -1;
}

export const dayKey = (quarterId, lessonId, dayId) => `${quarterId}/${lessonId}/${dayId}`;
export const hueOf = (lessonId) => (Number(lessonId) - 1) % 7;
