// Per-device state. localStorage can be missing or throw (private mode, blocked data): every access is guarded.
const KEY = "lga:v1";
const defaults = { theme: "auto", textScale: 1, speed: 1, clampLong: false, progress: {}, last: null };

let state = { ...defaults };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...defaults, ...JSON.parse(raw) };
} catch {
  /* run with defaults */
}

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: state lives for this session only */
    }
  }, 150);
}

export const store = {
  get: (k) => state[k],
  set(k, v) {
    state[k] = v;
    persist();
  },
  /** progress entry for "quarter/lesson/day": { pos, done } */
  progress: (key) => state.progress[key] ?? { pos: 0, done: false },
  setProgress(key, patch) {
    state.progress[key] = { ...store.progress(key), ...patch };
    persist();
  },
  clearProgress(key) {
    delete state.progress[key];
    persist();
  },
};
