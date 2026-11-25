import { phonemize, list_voices } from "phonemizer";
try { await phonemize("hola", "es"); } catch (e) {
  const m = e.message.split("Should be one of: ")[1] ?? "";
  const langs = m.split(", ").map((x) => x.trim());
  console.log("total ids:", langs.length);
  console.log("non-english:", langs.filter((l) => !/^(en|gmw\/en)/.test(l)).join(", ") || "(none)");
}
try { const v = await list_voices(); console.log("list_voices:", Array.isArray(v) ? v.length : typeof v, JSON.stringify(v).slice(0, 200)); } catch (e) { console.log("list_voices err:", String(e.message).slice(0, 120)); }
