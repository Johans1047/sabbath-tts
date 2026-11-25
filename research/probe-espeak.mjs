import init from "@echogarden/espeak-ng-emscripten";

const m = await init();
console.log("module keys:", Object.keys(m).filter((k) => !k.startsWith("_") && !/^[A-Z_]+$/.test(k)).slice(0, 40).join(", "));

const Worker = m.eSpeakNGWorker;
if (!Worker) throw new Error("no eSpeakNGWorker export");
const w = new Worker();
console.log("worker methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(w)).join(", "));

const voices = typeof w.list_voices === "function" ? w.list_voices() : null;
if (voices) {
  const arr = typeof voices.size === "function" ? Array.from({ length: voices.size() }, (_, i) => voices.get(i)) : voices;
  const es = arr.filter((v) => /^es|spanish/i.test(`${v.identifier ?? ""} ${v.name ?? ""} ${v.languages ?? ""}`));
  console.log("voices total:", arr.length, "| spanish:", JSON.stringify(es.map((v) => v.identifier ?? v.name)));
}

for (const lang of ["es", "es-419"]) {
  try {
    w.set_voice(lang);
    const r = w.synthesize_ipa("Ahora vamos a la sección de preguntas.");
    console.log(`[${lang}]`, JSON.stringify(r?.ipa ?? r));
  } catch (e) {
    console.log(`[${lang}] ERROR:`, String(e?.message ?? e).slice(0, 200));
  }
}
