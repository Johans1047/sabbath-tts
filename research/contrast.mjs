// WCAG contrast check for the palette in app/styles.css (hex values copied here on purpose: this is a one-off audit).
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, pct) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * pct + parseInt(b.slice(i, i + 2), 16) * (1 - pct)).toString(16).padStart(2, "0")).join("");

const hues = ["#0e6a64", "#a83f2b", "#6a3a5e", "#25497c", "#566a2c", "#8a5b10", "#2e5e44"];
const row = (label, fg, bg, min = 4.5) => {
  const r = ratio(fg, bg);
  console.log(`${r >= min ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}  ${label}`);
};

console.log("== light: on-band text over each week band ==");
hues.forEach((h, i) => row(`hue-${i} ${h} vs #fff7e8`, "#fff7e8", h));
console.log("== light: text on paper ==");
row("ink #1f1c17 / paper #f3eee4", "#1f1c17", "#f3eee4");
row("ink-soft #5b544a / paper", "#5b544a", "#f3eee4");
row("ink-soft / paper-raised #fbf8f1", "#5b544a", "#fbf8f1");
hues.forEach((h, i) => row(`hue-${i} label on paper-raised (Pregunta)`, h, "#fbf8f1"));
console.log("== dark: band is hue mixed 66% over #0b0906, text #f4ead6 ==");
hues.forEach((h, i) => row(`hue-${i} dimmed vs #f4ead6`, "#f4ead6", mix(h, "#0b0906", 0.66)));
console.log("== dark: text on night paper ==");
row("ink #ece3d0 / paper #17130f", "#ece3d0", "#17130f");
row("ink-soft #b4a994 / paper", "#b4a994", "#17130f");
row("ink-soft / paper-raised #211c16", "#b4a994", "#211c16");
console.log("== play button: cream pill ==");
row("cream-ink / cream", "#1f1c17", "#fbf4e4");
hues.forEach((h, i) => row(`hue-${i} glyph on cream (large graphic, 3:1)`, h, "#fbf4e4", 3));
console.log("== active segment tint ==");
hues.forEach((h, i) => row(`ink on hue-${i} 8% over paper`, "#1f1c17", mix(h, "#f3eee4", 0.08)));
hues.forEach((h, i) => row(`dark ink on hue-${i} 30% over night paper`, "#ece3d0", mix(h, "#17130f", 0.3)));
