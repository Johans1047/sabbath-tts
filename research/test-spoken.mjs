import { normalizeProse, speakReferences } from "../src/spoken.mjs";

const cases = [
  "Amedida que avanzamos",
  "(Mat. 7:15-20; 1 Juan 4:1-3)",
  "Mateo 7:15-20; 1 Juan 4:1-3",
  "Mateo 24:11, 23-25",
  "Efesios 2:19–3:7",
  "la Palabra. [...] Si se asimila",
  "Hechos 21:9 y 1 Timoteo 1:18; 4:12",
];
for (const c of cases) console.log(JSON.stringify(c), "\n   ->", JSON.stringify(normalizeProse(c)));
