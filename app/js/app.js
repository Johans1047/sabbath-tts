import { icons, stampMark, bigStamp } from "./icons.js";
import { store } from "./store.js";
import {
  audioUrl, loadCatalog, loadQuarter, loadDay, longDate, shortRange, weekdayInitial, dayOfMonth, todayIso,
  pickToday, fmtClock, fmtMinutes, timeline, activeSegment, dayKey, hueOf,
} from "./data.js";
import { createPlayer } from "./player.js";
import * as offline from "./offline.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const player = createPlayer($("audio"));
const state = {
  catalog: null,
  quarterId: null,
  quarter: null,
  lessonId: null,
  dayId: null,
  isToday: false,
  dayData: null,
  dayError: null,
  view: "day",
  status: "loading",
  error: null,
  saved: new Set(),
  dl: null, // { lessonId, done, total } while saving
  dlError: null,
  spans: null,
  estimated: false,
  active: -1,
  followUntil: 0,
  freshStamp: null, // key of a day just marked listened, so the stamp animates once
};

const SPEEDS = [0.8, 1, 1.15, 1.3, 1.5];
const rateLabel = (r) => `${String(r).replace(".", ",")}×`; // Spanish decimal comma
const SLEEP = [{ m: 15 }, { m: 30 }, { m: 45 }, { m: 60 }, { untilEnd: true, label: "Al terminar este día" }];

// ---------- lookups ----------

const lesson = () => state.quarter?.lessons.find((l) => l.id === state.lessonId);
const day = () => lesson()?.days.find((d) => d.id === state.dayId);
const keyOf = (l = state.lessonId, d = state.dayId) => dayKey(state.quarterId, l, d);
const fileUrl = (d) => (d.file ? audioUrl(state.quarterId, d.file) : null);
const isDone = (l, d) => store.progress(keyOf(l, d.id)).done;
const lessonAudioUrls = (l) => l.days.filter((d) => d.file).map(fileUrl);

// ---------- boot ----------

async function init() {
  applyTheme();
  applyTextScale();
  buildSettings();
  buildSleepMenu();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  renderLoading();
  await loadData();
  addEventListener("hashchange", route);
  wireGlobal();
}

async function loadData() {
  try {
    state.catalog = await loadCatalog();
    const wanted = parseHash().quarterId;
    state.quarterId = state.catalog.quarters.find((q) => q.id === wanted)?.id ?? state.catalog.quarters[0]?.id;
    if (!state.quarterId) throw new Error("No hay trimestres en el catálogo.");
    state.quarter = await loadQuarter(state.quarterId);
    state.status = "ready";
    refreshSaved();
    await route();
  } catch (e) {
    state.status = "error";
    state.error = e;
    render();
  }
}

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (h[0] === "semanas") return { view: "weeks" };
  if (h.length >= 3) return { quarterId: h[0], lessonId: h[1], dayId: h[2], view: "day" };
  return { view: "day" };
}

async function route() {
  if (!state.quarter) return;
  const r = parseHash();
  if (r.quarterId && r.quarterId !== state.quarterId && state.catalog.quarters.some((q) => q.id === r.quarterId)) {
    state.quarterId = r.quarterId;
    state.quarter = await loadQuarter(r.quarterId);
    refreshSaved();
  }
  state.view = r.view;
  if (r.view === "day") {
    const target = r.lessonId && state.quarter.lessons.find((l) => l.id === r.lessonId)?.days.some((d) => d.id === r.dayId)
      ? { lessonId: r.lessonId, dayId: r.dayId, isToday: state.quarter.lessons.find((l) => l.id === r.lessonId).days.find((d) => d.id === r.dayId).date === todayIso() }
      : pickToday(state.quarter);
    const changed = target.lessonId !== state.lessonId || target.dayId !== state.dayId;
    state.lessonId = target.lessonId;
    state.dayId = target.dayId;
    state.isToday = target.isToday;
    if (changed || !state.dayData) await loadCurrentDay();
  }
  render();
  if (state.view === "day") window.scrollTo({ top: 0, behavior: "auto" });
}

async function loadCurrentDay() {
  const d = day();
  state.dayData = null;
  state.dayError = null;
  state.active = -1;
  try {
    state.dayData = await loadDay(state.quarterId, d);
  } catch (e) {
    state.dayError = e;
  }
  computeTimeline();
}

function computeTimeline() {
  const d = day();
  const segs = state.dayData?.segments ?? [];
  const t = timeline(segs, d?.durationSec);
  state.spans = t.spans;
  state.estimated = t.estimated;
}

async function refreshSaved() {
  if (!state.quarter || !offline.supported) return;
  const urls = state.quarter.lessons.flatMap(lessonAudioUrls);
  state.saved = await offline.savedSet(urls);
  renderWeeks();
  renderTools();
}

// ---------- theme / settings ----------

function applyTheme() {
  document.documentElement.dataset.theme = store.get("theme");
}
function applyTextScale() {
  document.documentElement.style.setProperty("--read-scale", String(store.get("textScale")));
}
function syncThemeColor() {
  const el = $("stage");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!el || !meta) return;
  // computed colours of color-mix() come back as color(srgb ...); paint one pixel to get plain #rrggbb
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  ctx.canvas.width = ctx.canvas.height = 1;
  ctx.fillStyle = getComputedStyle(el).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  meta.setAttribute("content", `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
}

function buildSettings() {
  let pop = $("settings");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "settings";
    pop.className = "popover";
    pop.setAttribute("popover", "auto");
    document.body.append(pop);
  }
  const theme = store.get("theme");
  pop.innerHTML = `
    <h2>Ajustes</h2>
    <div class="field">
      <span class="field__label" id="theme-label">Apariencia</span>
      <div class="seg-control" role="group" aria-labelledby="theme-label">
        ${[["auto", "Automática"], ["light", "Día"], ["dark", "Noche"]].map(([v, t]) => `<button type="button" data-theme-set="${v}" aria-pressed="${theme === v}">${t}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field__label" for="text-scale">Tamaño del texto</label>
      <input class="scrub" id="text-scale" type="range" min="0.9" max="1.5" step="0.05" value="${store.get("textScale")}">
    </div>
    <div class="field">
      <span class="field__label" id="clamp-label">Párrafos largos</span>
      <div class="seg-control" role="group" aria-labelledby="clamp-label">
        ${[[false, "Completos"], [true, "Acortados"]].map(([v, t]) => `<button type="button" data-clamp-set="${v}" aria-pressed="${store.get("clampLong") === v}">${t}</button>`).join("")}
      </div>
    </div>`;
  pop.addEventListener("click", (e) => {
    const c = e.target.closest("[data-clamp-set]");
    if (c) {
      store.set("clampLong", c.dataset.clampSet === "true");
      pop.querySelectorAll("[data-clamp-set]").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      applyClamp();
      return;
    }
    const b = e.target.closest("[data-theme-set]");
    if (!b) return;
    store.set("theme", b.dataset.themeSet);
    applyTheme();
    pop.querySelectorAll("[data-theme-set]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    syncThemeColor();
  });
  pop.querySelector("#text-scale").addEventListener("input", (e) => {
    store.set("textScale", Number(e.target.value));
    applyTextScale();
    applyClamp(); // fewer or more lines now: re-measure what needs folding
  });
}

function buildSleepMenu() {
  let pop = $("sleep-menu");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "sleep-menu";
    pop.className = "popover popover--player";
    pop.setAttribute("popover", "auto");
    document.body.append(pop);
  }
  const cur = player.sleep;
  pop.innerHTML = `
    <h2>Apagar en…</h2>
    <div class="menu" role="menu">
      ${SLEEP.map((o, i) => `<button type="button" role="menuitemradio" data-sleep="${i}" aria-checked="${!!cur && (o.untilEnd ? cur.untilEnd : false)}">${o.label ?? `${o.m} minutos`}</button>`).join("")}
      ${cur ? `<button type="button" role="menuitem" data-sleep="off">Desactivar temporizador</button>` : ""}
    </div>`;
  pop.onclick = (e) => {
    const b = e.target.closest("[data-sleep]");
    if (!b) return;
    if (b.dataset.sleep === "off") player.clearSleep();
    else player.setSleep(SLEEP[Number(b.dataset.sleep)].untilEnd ? { untilEnd: true } : { minutes: SLEEP[Number(b.dataset.sleep)].m });
    pop.hidePopover();
    buildSleepMenu();
  };
}

// ---------- rendering ----------

function render() {
  const shell = $("shell");
  shell.dataset.view = state.view;
  renderWeeks();
  renderStage();
  renderTools();
  renderPage();
  renderPlayerBar();
  syncThemeColor();
  document.title = state.status === "ready" && day() ? `${day().title} · Lección ${Number(state.lessonId)} · La Guía en audio` : "La Guía en audio";
}

function renderLoading() {
  $("stage").dataset.hue = "0";
  $("stage").innerHTML = `<div class="topbar"><p class="topbar__title">La Guía en audio</p></div>
    <div class="hero"><div class="skel" style="height:3.2rem;width:70%"></div><div class="skel" style="height:1.2rem;width:50%;margin-top:1rem"></div><div class="skel" style="height:3.5rem;width:11rem;margin-top:1.5rem;border-radius:999px"></div></div>`;
  $("page").innerHTML = `<div class="skel" style="height:1.2rem;width:90%;margin-bottom:.8rem"></div><div class="skel" style="height:1.2rem;width:84%;margin-bottom:.8rem"></div><div class="skel" style="height:1.2rem;width:88%"></div>`;
}

function renderStage() {
  const stage = $("stage");
  if (state.status === "error") {
    stage.dataset.hue = "0";
    stage.innerHTML = `<div class="topbar"><p class="topbar__title">La Guía en audio</p></div><div class="hero"><h1 class="hero__title">Sin conexión con el audio</h1></div>`;
    return;
  }
  if (state.status !== "ready" || !lesson() || !day()) return;
  const l = lesson();
  const d = day();
  const hasAudio = !!d.file;
  const playingThis = player.item?.key === keyOf();
  const playing = playingThis && player.playing;
  const prog = store.progress(keyOf());
  const resume = hasAudio && !playing && prog.pos > 5 && !prog.done ? prog.pos : 0;

  stage.dataset.hue = String(hueOf(l.id));
  const quarters = state.catalog.quarters;
  const topTitle = quarters.length > 1
    ? `<select id="quarter-select" aria-label="Trimestre">${quarters.map((q) => `<option value="${esc(q.id)}" ${q.id === state.quarterId ? "selected" : ""}>${esc(q.title)}</option>`).join("")}</select>`
    : esc(state.quarter.quarter.title);

  const fresh = state.freshStamp === keyOf();
  state.freshStamp = null;
  const label = playing ? "Pausar" : resume ? "Continuar" : "Escuchar";
  const dur = d.durationSec ? ` · ${fmtMinutes(d.durationSec)}` : "";

  stage.innerHTML = `
    <div class="topbar">
      <button class="icon-btn icon-btn--text btn-weeks" type="button" data-act="weeks" aria-label="Ver las semanas">${icons.weeks}<span>Semanas</span></button>
      <p class="topbar__title">${topTitle}</p>
      <button class="icon-btn" type="button" popovertarget="settings" aria-label="Ajustes">${icons.sliders}</button>
    </div>
    <div class="hero">
      <h1 class="hero__title">${esc(d.title)}</h1>
      <p class="hero__meta">
        <span>Lección ${Number(l.id)} · ${esc(l.title)}</span>
        <span class="is-soft">${esc(longDate(d.date))}${state.isToday ? " · hoy" : ""}${hasAudio ? esc(dur) : ""}</span>
      </p>
      <div class="hero__actions">
        ${hasAudio
          ? `<button class="play-btn" type="button" data-act="play" aria-label="${label} ${esc(d.title)}">${playing ? icons.pause : icons.play}<span>${label}</span>${resume ? `<small>desde ${fmtClock(resume)}</small>` : ""}</button>`
          : `<button class="play-btn" type="button" disabled>${icons.play}<span>Sin audio todavía</span></button>`}
        ${hasAudio && prog.done ? bigStamp(fresh) : ""}
        ${hasAudio ? "" : `<p class="hero__note">Puedes leer la lección aquí abajo mientras se genera el audio.</p>`}
      </div>
    </div>
    <ul class="tabs" role="tablist" aria-label="Días de la lección ${Number(l.id)}">
      ${l.days.map((x) => tabHtml(l, x)).join("")}
    </ul>`;
}

/** Quiet row above the text: listened mark and offline saving for this week. */
function renderTools() {
  const el = $("tools");
  if (state.status !== "ready" || state.view !== "day" || !lesson() || !day()) {
    el.innerHTML = "";
    return;
  }
  const l = lesson();
  const prog = store.progress(keyOf());
  const urls = lessonAudioUrls(l);
  const savedCount = urls.filter((u) => state.saved.has(u)).length;
  const parts = [];
  if (day().file) parts.push(`<button class="text-btn" type="button" data-act="toggle-done">${icons.check}${prog.done ? "Quitar el sello" : "Marcar escuchado"}</button>`);
  let note = "";
  if (urls.length) {
    if (!offline.supported) {
      note = "Para guardar lecciones sin conexión, abre la app con https o desde localhost.";
    } else if (state.dl?.lessonId === l.id) {
      parts.push(`<button class="text-btn" type="button" disabled>${icons.download}Guardando ${state.dl.done} de ${state.dl.total}…</button>`);
    } else if (savedCount === urls.length) {
      parts.push(`<button class="text-btn" type="button" data-act="unsave" aria-label="Guardada sin conexión. Quitar de este dispositivo">${icons.saved}Guardada · Quitar</button>`);
    } else {
      const mb = l.days.filter((x) => x.file && !state.saved.has(fileUrl(x))).reduce((a, x) => a + (x.bytes ?? 0), 0) / 1e6;
      const size = mb ? ` (${mb.toFixed(1).replace(".", ",")} MB)` : "";
      parts.push(`<button class="text-btn" type="button" data-act="save" aria-label="Guardar la semana sin conexión${size}">${icons.download}Guardar semana${size}</button>`);
    }
    if (state.dlError) note = state.dlError;
  }
  el.innerHTML = parts.length || note ? `<div class="tools__row">${parts.join("")}${note ? `<p class="tools__note" role="status">${esc(note)}</p>` : ""}</div>` : "";
}

function tabHtml(l, x) {
  const selected = x.id === state.dayId;
  const done = isDone(l.id, x);
  const nowPlaying = player.item?.key === keyOf(l.id, x.id) && player.playing;
  const full = `${longDate(x.date)}, ${x.title}${x.file ? "" : ", sin audio"}${done ? ", escuchado" : ""}`;
  return `<li role="presentation"><button class="tab${x.file ? "" : " tab--empty"}" role="tab" type="button" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" data-day="${x.id}" aria-label="${esc(full)}">
      <span class="tab__letter">${weekdayInitial(x.date)}</span>
      <span class="tab__date">${dayOfMonth(x.date)}</span>
      ${x.date === todayIso() ? `<span class="tab__today" aria-hidden="true"></span>` : ""}
      ${done ? stampMark() : nowPlaying ? `<span class="tab__mark eq" aria-hidden="true"><i></i><i></i><i></i></span>` : ""}
    </button></li>`;
}

function renderPage() {
  const page = $("page");
  if (state.status === "error") {
    page.innerHTML = `<div class="state"><h2>No se pudo cargar el trimestre</h2>
      <p>Revisa la conexión o que el servidor del audio esté encendido. Si ya abriste la app antes, las lecciones guardadas siguen disponibles sin conexión.</p>
      <button class="btn" type="button" data-act="retry">Reintentar</button></div>`;
    return;
  }
  if (state.status !== "ready") return;
  if (state.view === "weeks") return;
  const d = day();
  if (state.dayError) {
    page.innerHTML = `<div class="state"><h2>No se pudo abrir el texto de este día</h2><p>No está guardado en este dispositivo y no hay conexión con el servidor.</p><button class="btn" type="button" data-act="retry-day">Reintentar</button></div>`;
    return;
  }
  if (!state.dayData) {
    page.innerHTML = `<div class="skel" style="height:1.2rem;width:90%;margin-bottom:.8rem"></div><div class="skel" style="height:1.2rem;width:80%"></div>`;
    return;
  }
  const segs = state.dayData.segments;
  const seekable = player.item?.key === keyOf() && !!state.spans;
  let html = d.file ? "" : `<p class="page__intro-note">Esta lección todavía no tiene audio. El texto es el que se leerá.</p>`;
  let openList = false;
  segs.forEach((s, i) => {
    const attrs = `data-i="${i}"${seekable ? " data-seek" : ""}`;
    if (s.type !== "list" && openList) {
      html += "</ul>";
      openList = false;
    }
    if (s.type === "intro") return;
    if (s.type === "list") {
      if (!openList) {
        html += `<ul role="list" style="margin:0;padding:0;list-style:none">`;
        openList = true;
      }
      html += `<li class="seg seg-list" ${attrs}>${esc(s.text)}</li>`;
      return;
    }
    if (s.type === "heading") html += `<h2 class="seg seg-heading" ${attrs}>${esc(s.text)}</h2>`;
    else if (s.type === "cue") html += `<h2 class="seg seg-heading" ${attrs}>Preguntas</h2>`;
    else if (s.type === "question") html += `<p class="seg seg-question" ${attrs}>${esc(s.text)}</p>`;
    else if (s.type === "verse") html += `<p class="seg seg-verse" ${attrs}>${esc(s.text)}</p>`;
    else html += `<p class="seg seg-text" ${attrs}>${esc(s.text)}</p>`;
  });
  if (openList) html += "</ul>";
  if (state.estimated && d.file) html += `<p class="page__footnote">El resaltado sigue el audio de forma aproximada.</p>`;
  page.innerHTML = html;
  page.dataset.hue = String(hueOf(state.lessonId));
  state.active = -1;
  applyClamp();
  highlight(player.item?.key === keyOf() ? player.time : -1);
}

/**
 * Optional folding of long paragraphs (Ajustes > Párrafos largos > Acortados).
 * A paragraph only gets a "Seguir leyendo" button when it really overflows 8 lines at the current width and size.
 */
function applyClamp() {
  const page = $("page");
  // remember which folded paragraphs the reader opened, so re-measuring never closes them
  const wasOpen = new Set([...page.querySelectorAll(".seg-text.is-open")].map((p) => p.dataset.i));
  page.querySelectorAll(".more").forEach((b) => b.remove());
  page.querySelectorAll(".seg-text").forEach((p) => p.classList.remove("is-clampable", "is-open"));
  if (!store.get("clampLong")) return;
  page.querySelectorAll(".seg-text").forEach((p) => {
    p.classList.add("is-clampable");
    if (p.scrollHeight <= p.clientHeight + 2) {
      p.classList.remove("is-clampable");
      return;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "more";
    b.dataset.more = p.dataset.i;
    b.setAttribute("aria-expanded", "false");
    b.textContent = "Seguir leyendo";
    p.after(b);
    if (wasOpen.has(p.dataset.i)) setOpen(p, true);
  });
  if (state.active >= 0) openClamped(page.querySelector(`[data-i="${state.active}"]`));
}

function setOpen(p, open) {
  p.classList.toggle("is-open", open);
  const b = p.nextElementSibling;
  if (b?.classList.contains("more")) {
    b.textContent = open ? "Mostrar menos" : "Seguir leyendo";
    b.setAttribute("aria-expanded", String(open));
  }
}
const openClamped = (el) => el?.classList.contains("is-clampable") && setOpen(el, true);

function renderWeeks() {
  const el = $("weeks");
  if (state.status !== "ready") {
    el.innerHTML = "";
    return;
  }
  const today = todayIso();
  const q = state.quarter;
  el.innerHTML = `
    <div class="weeks__head">
      <div style="flex:1">
        <h2 class="weeks__title">Semanas</h2>
        <p class="weeks__quarter">${esc(q.quarter.title)}</p>
      </div>
      <button class="icon-btn weeks__close" type="button" data-act="close-weeks" aria-label="Cerrar la lista de semanas">${icons.close}</button>
    </div>
    <ol>
      ${q.lessons.map((l) => {
        const withAudio = l.days.filter((x) => x.file);
        const done = withAudio.filter((x) => isDone(l.id, x)).length;
        const urls = lessonAudioUrls(l);
        const isSaved = urls.length > 0 && urls.every((u) => state.saved.has(u));
        const current = l.start <= today && today <= l.end;
        const meta = [
          shortRange(l.start, l.end),
          current ? "Esta semana" : null,
          withAudio.length ? `${done} de ${withAudio.length} escuchados` : "Sin audio todavía",
          isSaved ? "Guardada" : null,
        ].filter(Boolean);
        return `<li><button class="week${withAudio.length ? "" : " week--empty"}" type="button" data-hue="${hueOf(l.id)}" data-lesson="${l.id}" ${l.id === state.lessonId ? 'aria-current="true"' : ""}>
          <span class="week__num" aria-hidden="true">${Number(l.id)}</span>
          <span>
            <span class="week__name">${esc(l.title)}</span>
            <span class="week__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</span>
            <span class="week__bar" aria-hidden="true">${l.days.map((x) => `<i class="${isDone(l.id, x) ? "is-done" : x.file ? "is-ready" : ""}"></i>`).join("")}</span>
          </span>
        </button></li>`;
      }).join("")}
    </ol>`;
}

// ---------- player bar ----------

function renderPlayerBar() {
  const bar = $("player");
  const item = player.item;
  if (!item) {
    bar.hidden = true;
    return;
  }
  const hue = item.hue;
  bar.hidden = false;
  bar.dataset.hue = String(hue);
  if (!bar.dataset.built) {
    bar.dataset.built = "1";
    bar.innerHTML = `
      <div class="player__row player__now"><strong id="pl-title"></strong><time id="pl-time">0:00 / 0:00</time></div>
      <div class="player__row"><input class="scrub" id="pl-scrub" type="range" min="0" max="1000" step="1" value="0" aria-label="Posición de la lección"></div>
      <div class="player__row player__controls">
        <button class="chip" id="pl-speed" type="button" aria-label="Velocidad de reproducción"></button>
        <button class="icon-btn" id="pl-back" type="button" aria-label="Retroceder 15 segundos">${icons.back15}</button>
        <button class="icon-btn player__play" id="pl-play" type="button" aria-label="Reproducir"></button>
        <button class="icon-btn" id="pl-fwd" type="button" aria-label="Adelantar 15 segundos">${icons.fwd15}</button>
        <button class="icon-btn icon-btn--text" id="pl-sleep" type="button" popovertarget="sleep-menu" aria-label="Temporizador de apagado">${icons.moon}<span id="pl-sleep-left"></span></button>
      </div>`;
    $("pl-play").onclick = () => player.toggle();
    $("pl-back").onclick = () => player.skip(-15);
    $("pl-fwd").onclick = () => player.skip(15);
    $("pl-speed").onclick = () => {
      const i = SPEEDS.indexOf(player.rate);
      player.setRate(SPEEDS[(i + 1) % SPEEDS.length]);
    };
    const scrub = $("pl-scrub");
    scrub.oninput = () => {
      if (player.duration) player.seek((scrub.value / 1000) * player.duration);
    };
  }
  $("pl-title").textContent = item.title;
  $("pl-speed").textContent = rateLabel(player.rate);
  updatePlayerState();
  updateTime();
}

function updatePlayerState() {
  const b = $("pl-play");
  if (!b) return;
  b.innerHTML = player.playing ? icons.pause : icons.play;
  b.setAttribute("aria-label", player.playing ? "Pausar" : "Reproducir");
}

function updateTime() {
  const t = player.time;
  const dur = player.duration;
  const time = $("pl-time");
  if (!time) return;
  time.textContent = `${fmtClock(t)} / ${fmtClock(dur)}`;
  const scrub = $("pl-scrub");
  if (scrub && document.activeElement !== scrub) {
    scrub.value = dur ? String(Math.round((t / dur) * 1000)) : "0";
  }
  scrub?.style.setProperty("--pct", `${dur ? (t / dur) * 100 : 0}%`);
  if (player.item?.key === keyOf()) highlight(t);
}

function highlight(t) {
  const page = $("page");
  if (!state.spans || t < 0) {
    page.querySelectorAll(".seg.is-active").forEach((n) => n.classList.remove("is-active"));
    state.active = -1;
    return;
  }
  const i = activeSegment(state.spans, t);
  if (i === state.active) return;
  state.active = i;
  page.querySelectorAll(".seg.is-active").forEach((n) => n.classList.remove("is-active"));
  const el = page.querySelector(`[data-i="${i}"]`);
  if (!el) return;
  el.classList.add("is-active");
  openClamped(el); // never let the voice run ahead of folded text
  // the spoken "ahora vamos a las preguntas" and the question it introduces are one unit
  if (state.dayData?.segments[i]?.type === "cue") page.querySelector(`[data-i="${i + 1}"]`)?.classList.add("is-active");
  // Follow the voice only when the active block is out of the comfortable reading area:
  // pressing Escuchar must not yank the title away.
  if (Date.now() > state.followUntil && player.playing) {
    const r = el.getBoundingClientRect();
    const playerTop = innerHeight - ($("player").offsetHeight || 0);
    const visible = r.top >= 56 && r.top < playerTop - 96;
    if (!visible) el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }
}

// ---------- actions ----------

async function playCurrent() {
  const d = day();
  if (!d?.file) return;
  const key = keyOf();
  if (player.item?.key === key) return player.toggle();
  const l = lesson();
  player.load(
    { key, title: `${d.title} · Lección ${Number(l.id)}`, subtitle: l.title, src: audioUrl(state.quarterId, d.file), hue: hueOf(l.id) },
    { autoplay: true },
  );
  render();
}

async function saveLessonOffline() {
  const l = lesson();
  const audio = lessonAudioUrls(l).filter((u) => !state.saved.has(u));
  // the quarter index and catalog too: on a first visit the service worker did not control the page yet,
  // so without them the app could not even list its weeks offline
  const data = [
    "audio/catalog.json",
    `audio/${state.quarterId}/index.json`,
    ...l.days.filter((x) => x.data).map((x) => `audio/${state.quarterId}/${x.data}`),
  ];
  state.dl = { lessonId: l.id, done: 0, total: audio.length };
  state.dlError = null;
  renderTools();
  const res = await offline.saveLesson({ audio, data }, (done, total) => {
    state.dl = { lessonId: l.id, done, total };
    renderTools();
  });
  state.dl = null;
  if (!res.ok) state.dlError = res.reason === "quota" ? "No hay espacio suficiente en este dispositivo para guardar la semana." : "No se pudo descargar todo. Revisa la conexión y vuelve a intentarlo.";
  await refreshSaved();
}

async function removeLessonOffline() {
  await offline.removeLesson({ audio: lessonAudioUrls(lesson()) });
  state.dlError = null;
  await refreshSaved();
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 4200);
}

// ---------- events ----------

function wireGlobal() {
  document.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "play") return playCurrent();
    if (act === "save") return saveLessonOffline();
    if (act === "unsave") return removeLessonOffline();
    if (act === "weeks") return void (location.hash = "#/semanas");
    if (act === "close-weeks") return void (location.hash = `#/${state.quarterId}/${state.lessonId}/${state.dayId}`);
    if (act === "retry") return loadData();
    if (act === "retry-day") return loadCurrentDay().then(render);
    if (act === "toggle-done") {
      const k = keyOf();
      const done = store.progress(k).done;
      store.setProgress(k, { done: !done, pos: done ? store.progress(k).pos : 0 });
      if (!done) state.freshStamp = k;
      render();
      return;
    }
    const tab = e.target.closest("[data-day]");
    if (tab) return void (location.hash = `#/${state.quarterId}/${state.lessonId}/${tab.dataset.day}`);
    const week = e.target.closest("[data-lesson]");
    if (week) {
      const l = state.quarter.lessons.find((x) => x.id === week.dataset.lesson);
      const today = todayIso();
      const pick = l.days.find((x) => x.date === today) ?? l.days.find((x) => x.file) ?? l.days[0];
      return void (location.hash = `#/${state.quarterId}/${l.id}/${pick.id}`);
    }
    const more = e.target.closest("[data-more]");
    if (more) {
      const p = $("page").querySelector(`.seg[data-i="${more.dataset.more}"]`);
      return void (p && setOpen(p, !p.classList.contains("is-open")));
    }
    const seg = e.target.closest("[data-seek]");
    if (seg && state.spans && !getSelection().toString()) {
      player.seek(state.spans[Number(seg.dataset.i)].start + 0.01);
      state.followUntil = 0;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "quarter-select") location.hash = `#/${e.target.value}/${state.lessonId}/${state.dayId}`;
  });

  // roving focus + arrows inside the day tabs
  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.('[role="tab"]');
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      const next = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
      e.preventDefault();
      return;
    }
    if (e.target.closest?.("input, select, textarea, button, [popover]")) return;
    if (e.key === " " && player.item) {
      e.preventDefault();
      player.toggle();
    } else if (e.key === "ArrowLeft" && player.item) player.skip(-15);
    else if (e.key === "ArrowRight" && player.item) player.skip(15);
  });

  // the column width changes on rotate/resize, so folded paragraphs are measured again
  // (height-only resizes happen when a phone's address bar hides while scrolling: ignore those)
  let resizeTimer;
  let lastWidth = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyClamp, 200);
  });

  // reading by hand pauses the auto-follow for a while
  for (const ev of ["wheel", "touchmove"]) addEventListener(ev, () => (state.followUntil = Date.now() + 8000), { passive: true });

  player.bus.addEventListener("time", updateTime);
  player.bus.addEventListener("state", () => {
    updatePlayerState();
    renderStage();
    renderPlayerBar();
  });
  player.bus.addEventListener("loaded", () => {
    renderPlayerBar();
    renderPage();
  });
  player.bus.addEventListener("rate", () => ($("pl-speed").textContent = rateLabel(player.rate)));
  player.bus.addEventListener("done", (e) => {
    state.freshStamp = e.detail.key;
    renderStage();
    renderWeeks();
  });
  player.bus.addEventListener("error", (e) => toast(e.detail.message));
  player.bus.addEventListener("sleep", (e) => {
    const out = $("pl-sleep-left");
    if (!out) return;
    const { left } = e.detail;
    out.textContent = left ? `${Math.max(1, Math.ceil(left / 60000))} min` : player.sleep?.untilEnd ? "fin" : "";
    buildSleepMenu();
  });
}

init();
