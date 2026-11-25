// Turns written Spanish (Bible references, abbreviations, ranges) into text a TTS engine reads naturally.

// [spoken name, ordinal style, abbreviations/aliases without dots]
const BOOKS = [
  ["Génesis", 0, ["gen", "gén", "génesis", "genesis"]],
  ["Éxodo", 0, ["ex", "éx", "éxo", "éxodo", "exodo"]],
  ["Levítico", 0, ["lev", "levítico", "levitico"]],
  ["Números", 0, ["num", "núm", "números", "numeros"]],
  ["Deuteronomio", 0, ["deut", "deuteronomio"]],
  ["Josué", 0, ["jos", "josué", "josue"]],
  ["Jueces", 0, ["jue", "jueces"]],
  ["Rut", 0, ["rut"]],
  ["Samuel", "o", ["sam", "samuel"]],
  ["Reyes", "o", ["rey", "reyes"]],
  ["Crónicas", "o", ["crón", "cron", "crónicas", "cronicas"]],
  ["Esdras", 0, ["esd", "esdras"]],
  ["Nehemías", 0, ["neh", "nehemías", "nehemias"]],
  ["Ester", 0, ["est", "ester"]],
  ["Job", 0, ["job"]],
  ["Salmos", 0, ["sal", "salmo", "salmos"]],
  ["Proverbios", 0, ["prov", "proverbios"]],
  ["Eclesiastés", 0, ["ecl", "eclesiastés", "eclesiastes"]],
  ["Cantares", 0, ["cant", "cantares"]],
  ["Isaías", 0, ["isa", "isaías", "isaias"]],
  ["Jeremías", 0, ["jer", "jeremías", "jeremias"]],
  ["Lamentaciones", 0, ["lam", "lamentaciones"]],
  ["Ezequiel", 0, ["eze", "ezeq", "ezequiel"]],
  ["Daniel", 0, ["dan", "daniel"]],
  ["Oseas", 0, ["os", "oseas"]],
  ["Joel", 0, ["joel"]],
  ["Amós", 0, ["amós", "amos"]],
  ["Abdías", 0, ["abd", "abdías", "abdias"]],
  ["Jonás", 0, ["jon", "jonás", "jonas"]],
  ["Miqueas", 0, ["miq", "miqueas"]],
  ["Nahúm", 0, ["nah", "nahúm", "nahum"]],
  ["Habacuc", 0, ["hab", "habacuc"]],
  ["Sofonías", 0, ["sof", "sofonías", "sofonias"]],
  ["Hageo", 0, ["hag", "hageo"]],
  ["Zacarías", 0, ["zac", "zacarías", "zacarias"]],
  ["Malaquías", 0, ["mal", "malaquías", "malaquias"]],
  ["Mateo", 0, ["mat", "mateo"]],
  ["Marcos", 0, ["mar", "marcos"]],
  ["Lucas", 0, ["luc", "lucas"]],
  ["Juan", "a", ["jn", "juan"]],
  ["Hechos", 0, ["hech", "hechos"]],
  ["Romanos", 0, ["rom", "romanos"]],
  ["Corintios", "a", ["cor", "corintios"]],
  ["Gálatas", 0, ["gál", "gal", "gálatas", "galatas"]],
  ["Efesios", 0, ["efe", "ef", "efesios"]],
  ["Filipenses", 0, ["fil", "filipenses"]],
  ["Colosenses", 0, ["col", "colosenses"]],
  ["Tesalonicenses", "a", ["tes", "tesalonicenses"]],
  ["Timoteo", "a", ["tim", "timoteo"]],
  ["Tito", 0, ["tito"]],
  ["Filemón", 0, ["filem", "filemón", "filemon"]],
  ["Hebreos", 0, ["heb", "hebreos"]],
  ["Santiago", 0, ["sant", "santiago"]],
  ["Pedro", "a", ["ped", "pedro"]],
  ["Judas", 0, ["jud", "judas"]],
  ["Apocalipsis", 0, ["apoc", "ap", "apocalipsis"]],
];

const ORDINALS = { a: ["", "Primera de", "Segunda de", "Tercera de"], o: ["", "Primero de", "Segundo de", "Tercero de"] };
const ALIAS = new Map();
for (const [name, ord, aliases] of BOOKS) for (const a of aliases) ALIAS.set(a, { name, ord });

const aliasPattern = [...ALIAS.keys()]
  .sort((a, b) => b.length - a.length)
  .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const DASH = "[–—-]";
const VERSE_PART = `\\d+(?::\\d+)?(?:\\s*${DASH}\\s*\\d+(?::\\d+)?)?(?:\\s*[,;]\\s*(?![123]\\s+\\p{L})\\d+(?::\\d+)?(?:\\s*${DASH}\\s*\\d+(?::\\d+)?)?)*`;
const REF_RE = new RegExp(`(?<![\\p{L}\\d])([123]\\s?)?(${aliasPattern})\\.?\\s+(${VERSE_PART})`, "giu");

function bookName(num, alias) {
  const entry = ALIAS.get(alias.toLowerCase());
  if (!entry) return null;
  const n = num ? parseInt(num, 10) : 0;
  if (n && entry.ord) return `${ORDINALS[entry.ord][n]} ${entry.name}`;
  return n ? `${n} ${entry.name}` : entry.name;
}

/** "2:19–3:7", "11-13", "24:11, 23-25" -> spoken chapter/verse phrase. */
export function speakVerses(v) {
  let s = v.replace(/\s+/g, " ").trim();
  s = s.replace(new RegExp(`(\\d+):(\\d+)\\s*${DASH}\\s*(\\d+):(\\d+)`, "g"), "capítulo $1, versículo $2, al capítulo $3, versículo $4");
  s = s.replace(new RegExp(`(\\d+):(\\d+)\\s*${DASH}\\s*(\\d+)`, "g"), "capítulo $1, versículos $2 al $3");
  s = s.replace(/(?<!\d)(\d+):(\d+)/g, "capítulo $1, versículo $2");
  // remaining list items after the first chapter:verse ("..., 23-25", "..., 7")
  s = s.replace(new RegExp(`([,;])\\s*(\\d+)\\s*${DASH}\\s*(\\d+)`, "g"), "$1 y los versículos $2 al $3");
  s = s.replace(/([,;])\s*(\d+)(?!\d|\s*(?:al|,))/g, "$1 y el versículo $2");
  return s;
}

/** Expand every Bible reference found in `text` (full names or abbreviations). */
export function speakReferences(text) {
  return text.replace(REF_RE, (m, num, alias, verses) => {
    const name = bookName(num?.trim(), alias);
    return name ? `${name} ${speakVerses(verses)}` : m;
  });
}

// Bible versions and publishers that appear as capitals. A TTS would read them as made-up words.
const ACRONYMS = [
  [/\bNBLA\b/g, "Nueva Biblia de las Américas"],
  [/\bNTV\b/g, "Nueva Traducción Viviente"],
  [/\bNVI\b/g, "Nueva Versión Internacional"],
  [/\bRVC\b/g, "Reina-Valera Contemporánea"],
  [/\bRVR\b/g, "Reina-Valera"],
  [/\bPDT\b/g, "Palabra de Dios para Todos"],
  [/\bNBV\b/g, "Nueva Biblia Viva"],
  [/\bTLA\b/g, "Traducción en Lenguaje Actual"],
  [/\bIADPA\b/g, "I A D P A"],
  [/\bGPS\b/g, "G P S"],
];

const BIBLIO = [
  [/\bd\.\s?C\./g, "después de Cristo"],
  [/\ba\.\s?C\./g, "antes de Cristo"],
  [/\beds\./gi, "editores"],
  [/\bcf\./gi, "véase"],
  [/\bpp\.\s*(?=\d)/gi, "páginas "],
  [/\bp\.\s*(?=\d)/gi, "página "],
  [/\bcaps\.\s*(?=\d)/gi, "capítulos "],
  [/\bcap\.\s*(?=\d)/gi, "capítulo "],
  [/\bt\.\s*(?=\d)/gi, "tomo "],
  [/\bvol\.\s*(?=\d)/gi, "volumen "],
  [/\bIbid\.?/g, "Ibídem"],
  [/\betc\./gi, "etcétera"],
];

// Typos present in the source text (verified in the API output, not in our parsing).
const SOURCE_TYPOS = [[/\bAmedida\b/g, "A medida"]];

/** Full normalization of a block of prose before synthesis. */
export function normalizeProse(text) {
  let s = text.replace(/ /g, " ");
  for (const [re, to] of SOURCE_TYPOS) s = s.replace(re, to);
  s = s.replace(/\[\s*(?:\.\.\.|…)\s*\]/g, "…"); // omission marker in quotations
  s = s.replace(/\[([^\]]+)\]/g, "$1"); // [Rodea] -> Rodea
  s = s.replace(/https?:\/\/\S+/g, "el enlace que aparece en la lección");
  s = speakReferences(s);
  // bare chapter:verse left over, e.g. "el libro de Hebreos (1:1-3)"
  s = s.replace(new RegExp(`(?<![\\d:])\\d+:\\d+(?:\\s*${DASH}\\s*\\d+(?::\\d+)?)?(?![\\d:])`, "g"), (m) => speakVerses(m));
  for (const [re, to] of ACRONYMS) s = s.replace(re, to);
  for (const [re, to] of BIBLIO) s = s.replace(re, to);
  s = s.replace(new RegExp(`(?<![\\d:])(\\d+)\\s*${DASH}\\s*(\\d+)(?![\\d:])`, "g"), "$1 al $2");
  s = s.replace(/\s+([,.;:!?])/g, "$1").replace(/\s+/g, " ").trim();
  return s;
}
