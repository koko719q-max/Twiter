// ─────────────────────────────────────────────
// COLOR SYSTEM (OWNER ONLY)
// ─────────────────────────────────────────────

function applyColors(text) {
  const colors = {
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

  // ─────────────────────────────
  // BASIC COLORS: <red> text
  // ─────────────────────────────
  let result = text.replace(/<(\w+)>\s?([^<]+)/g, (match, color, content) => {
    const c = colors[color.toLowerCase()];
    if (!c) return content;

    return `<span style="color:${c}; font-weight:500;">${content}</span>`;
  });

  // ─────────────────────────────
  // 🌈 RAINBOW
  // ─────────────────────────────
  result = result.replace(/<rainbow>\s?([\s\S]+)/g, (match, content) => {
    const rainbowColors = [
      "#ff3b30",
      "#ff9500",
      "#ffcc00",
      "#34c759",
      "#1d9bf0",
      "#af52de"
    ];

    return [...content]
      .map((letter, i) => {
        const color = rainbowColors[i % rainbowColors.length];
        return `<span style="color:${color}; font-weight:600;">${letter}</span>`;
      })
      .join("");
  });

  // ─────────────────────────────
  // ⚡ NEON EFFECT: <neon> text
  // ─────────────────────────────
  result = result.replace(/<neon>\s?([\s\S]+)/g, (match, content) => {
    const neonColors = [
      "#ff3b30",
      "#ff9500",
      "#ffcc00",
      "#34c759",
      "#1d9bf0",
      "#af52de"
    ];

    return [...content]
      .map((letter, i) => {
        const color = neonColors[i % neonColors.length];

        return `<span style="
          color:${color};
          font-weight:600;
          text-shadow: 0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color};
        ">${letter}</span>`;
      })
      .join("");
  });

  return result;
}

// export
window.applyColors = applyColors;

