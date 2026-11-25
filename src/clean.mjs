import { parse } from "node-html-parser";
import { normalizeProse, speakReferences } from "./spoken.mjs";

const QUESTIONS_CUE = "Ahora vamos a la sección de preguntas.";

/** Plain text of an element with verse links expanded and footnote markers dropped. */
function inlineText(el) {
  const copy = parse(el.outerHTML).firstChild;
  copy.querySelectorAll("sup").forEach((n) => n.remove());
  copy.querySelectorAll("br").forEach((n) => n.replaceWith(". "));
  return normalizeProse(copy.text);
}

function verseTextFor(bible, key) {
  const raw = bible?.[0]?.verses?.[key];
  if (!raw) return null;
  const root = parse(raw);
  root.querySelectorAll("h2").forEach((n) => n.remove());
  root.querySelectorAll("sup").forEach((n) => n.remove());
  return root.text.replace(/\s+/g, " ").trim() || null;
}

/**
 * Convert a lesson-day HTML body into ordered spoken segments:
 *   { type: "heading" | "text" | "list" | "question" | "cue" | "verse", text }
 *
 * options.verses: "ref" (reference only, default) | "text" (also read the verse text when the API has it)
 */
export function htmlToSegments(html, { bible = null, verses = "ref", questionsCue = QUESTIONS_CUE } = {}) {
  const root = parse(html);
  const segments = [];
  const seenVerses = new Set();
  let afterHr = false;
  let lastType = null;

  const push = (type, text) => {
    if (!text) return;
    if (type === "question" && lastType !== "question") segments.push({ type: "cue", text: questionsCue });
    segments.push({ type, text });
    lastType = type;
  };

  for (const node of root.childNodes) {
    const tag = node.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "hr") {
      afterHr = true;
      continue;
    }
    const plain = node.text.trim();
    // Footnotes after the <hr>: either layout-JSON junk or a leading superscript number.
    if (afterHr && (plain.startsWith("{") || node.firstChild?.tagName?.toLowerCase() === "sup")) continue;

    if (/^h[1-6]$/.test(tag)) {
      push("heading", inlineText(node));
    } else if (tag === "ul" || tag === "ol") {
      for (const li of node.querySelectorAll("li")) push("list", inlineText(li));
    } else if (tag === "p") {
      const codes = node.querySelectorAll("code");
      const questions = codes.map((c) => inlineText(c)).filter(Boolean);
      const rest = parse(node.outerHTML).firstChild;
      rest.querySelectorAll("code").forEach((c) => c.remove());
      const restText = rest.text.trim() ? inlineText(rest) : "";

      if (restText) push("text", restText);
      if (verses === "text") {
        for (const a of node.querySelectorAll("a.verse")) {
          for (const key of (a.getAttribute("verse") ?? "").split(",")) {
            if (seenVerses.has(key)) continue;
            seenVerses.add(key);
            const vt = verseTextFor(bible, key);
            if (vt) push("verse", normalizeProse(vt));
          }
        }
      }
      for (const q of questions) push("question", q);
    }
  }
  return segments;
}

export { QUESTIONS_CUE, speakReferences };
