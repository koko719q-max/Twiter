// ─────────────────────────────────────────────
// COLOR SYSTEM (OWNER ONLY)
// ─────────────────────────────────────────────
//
// ✔️ FIX: vse besedilo je zdaj HTML-escapano preden ga vstavimo v DOM.
// Prej se je surovo besedilo (npr. <img src=x onerror=...>) prepisalo
// nespremenjeno, če ni ustrezalo znanemu barvnemu tagu — kar je
// omogočalo stored XSS. Zdaj se najprej escape-a VSAKA črka/beseda,
// šele nato se okoli nje ovije <span> za barvo.

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  red: "#ff3b30",
  blue: "#1d9bf0",
  green: "#34c759",
  yellow: "#ffcc00",
  purple: "#af52de",
  pink: "#ff2d55",
  orange: "#ff9500",
  cyan: "#5ac8fa",
  lime: "#32d74b",
  gray: "#8e8e93"
};

const RAINBOW_COLORS = [
  "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#1d9bf0", "#af52de"
];

function applyColors(text = "") {
  // Najdi vse tage <ime> v SUROVEM besedilu (preden ga escape-amo)
  const tagRegex = /<(\w+)>/g;
  const matches = [];
  let m;
  while ((m = tagRegex.exec(text)) !== null) {
    matches.push({ tag: m[1].toLowerCase(), index: m.index, len: m[0].length });
  }

  // Brez tagov: samo varno escape-ano besedilo, brez barv
  if (matches.length === 0) {
    return escapeHtml(text);
  }

  let out = escapeHtml(text.slice(0, matches[0].index));

  matches.forEach((match, i) => {
    const start = match.index + match.len;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawContent = text.slice(start, end).replace(/^\s/, "");

    if (match.tag === "rainbow" || match.tag === "neon") {
      out += [...rawContent].map((ch, idx) => {
        const color = RAINBOW_COLORS[idx % RAINBOW_COLORS.length];
        const safeCh = escapeHtml(ch);
        if (match.tag === "neon") {
          return `<span style="color:${color}; font-weight:600; text-shadow:0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color};">${safeCh}</span>`;
        }
        return `<span style="color:${color}; font-weight:600;">${safeCh}</span>`;
      }).join("");
    } else if (COLORS[match.tag]) {
      out += `<span style="color:${COLORS[match.tag]}; font-weight:500;">${escapeHtml(rawContent)}</span>`;
    } else {
      // Neznan tag → obravnavaj kot navadno (escape-ano) besedilo, vključno s samim tagom
      out += escapeHtml(`<${match.tag}>`) + escapeHtml(rawContent);
    }
  });

  return out;
}

// ── Exports ────────────────────────────────────────────
export { applyColors, escapeHtml };

// Ohranjeno za nazaj združljivost (če se kje še kliče window.applyColors)
window.applyColors = applyColors;
