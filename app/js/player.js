import { store } from "./store.js";

/** Playback, saved position, speed, sleep timer and lock-screen controls around one <audio> element. */
export function createPlayer(audio) {
  const bus = new EventTarget();
  const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

  let item = null; // { key, title, subtitle, src }
  let lastSaved = 0;
  let sleep = null; // { endAt, untilEnd, tick }

  audio.playbackRate = store.get("speed");
  audio.preservesPitch = true;

  function savePosition(force = false) {
    if (!item || !Number.isFinite(audio.duration)) return;
    const now = Date.now();
    if (!force && now - lastSaved < 4000) return;
    lastSaved = now;
    const nearEnd = audio.currentTime >= audio.duration * 0.95;
    const prev = store.progress(item.key);
    if (nearEnd && !prev.done) emit("done", { key: item.key });
    store.setProgress(item.key, { pos: nearEnd ? 0 : Math.floor(audio.currentTime), done: prev.done || nearEnd });
  }

  audio.addEventListener("timeupdate", () => {
    savePosition();
    emit("time", { time: audio.currentTime, duration: audio.duration });
  });
  audio.addEventListener("play", () => emit("state", { playing: true }));
  audio.addEventListener("pause", () => {
    savePosition(true);
    emit("state", { playing: false });
  });
  audio.addEventListener("ended", () => {
    if (item) {
      const wasDone = store.progress(item.key).done;
      store.setProgress(item.key, { pos: 0, done: true });
      if (!wasDone) emit("done", { key: item.key });
    }
    if (sleep?.untilEnd) clearSleep();
    emit("state", { playing: false });
    emit("ended", {});
  });
  audio.addEventListener("error", () => emit("error", { message: "No se pudo reproducir este audio." }));
  audio.addEventListener("loadedmetadata", () => emit("time", { time: audio.currentTime, duration: audio.duration }));

  function setupMediaSession() {
    if (!("mediaSession" in navigator) || !item) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: item.subtitle, album: "La Guía en audio" });
    const set = (a, fn) => {
      try {
        navigator.mediaSession.setActionHandler(a, fn);
      } catch {
        /* action not supported on this platform */
      }
    };
    set("play", () => api.play());
    set("pause", () => api.pause());
    set("seekbackward", () => api.skip(-15));
    set("seekforward", () => api.skip(15));
    set("seekto", (d) => api.seek(d.seekTime));
  }

  const api = {
    bus,
    get item() {
      return item;
    },
    get playing() {
      return !audio.paused;
    },
    get time() {
      return audio.currentTime || 0;
    },
    get duration() {
      return Number.isFinite(audio.duration) ? audio.duration : 0;
    },
    get rate() {
      return audio.playbackRate;
    },

    /** Load a day. Resumes from the saved position unless startAt is given. */
    load(next, { startAt = null, autoplay = false } = {}) {
      if (item?.key === next.key && audio.src.endsWith(next.src)) {
        if (autoplay) api.play();
        return;
      }
      if (item) savePosition(true);
      item = next;
      audio.src = next.src;
      const resume = startAt ?? store.progress(next.key).pos;
      const onMeta = () => {
        if (resume > 1 && resume < audio.duration - 2) audio.currentTime = resume;
        emit("time", { time: audio.currentTime, duration: audio.duration });
        if (autoplay) api.play();
      };
      audio.addEventListener("loadedmetadata", onMeta, { once: true });
      audio.load();
      store.set("last", { key: next.key });
      setupMediaSession();
      emit("loaded", { item });
    },
    async play() {
      try {
        await audio.play();
      } catch (e) {
        emit("error", { message: "El navegador bloqueó la reproducción. Toca Escuchar otra vez." });
      }
    },
    pause: () => audio.pause(),
    toggle: () => (audio.paused ? api.play() : api.pause()),
    seek(t) {
      if (!Number.isFinite(audio.duration)) return;
      audio.currentTime = Math.max(0, Math.min(audio.duration, t));
      emit("time", { time: audio.currentTime, duration: audio.duration });
    },
    skip: (d) => api.seek(audio.currentTime + d),
    setRate(r) {
      audio.playbackRate = r;
      store.set("speed", r);
      emit("rate", { rate: r });
    },

    get sleep() {
      return sleep ? { endAt: sleep.endAt, untilEnd: sleep.untilEnd } : null;
    },
    setSleep({ minutes = null, untilEnd = false }) {
      clearSleep();
      sleep = { endAt: minutes ? Date.now() + minutes * 60000 : null, untilEnd, tick: null };
      if (minutes) {
        sleep.tick = setInterval(() => {
          const left = sleep.endAt - Date.now();
          emit("sleep", { left });
          if (left <= 0) fadeAndPause();
        }, 1000);
      }
      emit("sleep", { left: minutes ? minutes * 60000 : null, untilEnd });
    },
    clearSleep: () => clearSleep(),
  };

  function clearSleep() {
    if (sleep?.tick) clearInterval(sleep.tick);
    sleep = null;
    emit("sleep", { left: null, untilEnd: false });
  }

  function fadeAndPause() {
    clearSleep();
    const start = audio.volume;
    let step = 0;
    const id = setInterval(() => {
      step++;
      audio.volume = Math.max(0, start * (1 - step / 8));
      if (step >= 8) {
        clearInterval(id);
        audio.pause();
        audio.volume = start; // iOS keeps volume read-only; the pause still happens
      }
    }, 500);
  }

  return api;
}
