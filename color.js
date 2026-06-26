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

  let result = text;

  // BASIC COLORS
  Object.entries(colors).forEach(([name, color]) => {
    const regex = new RegExp(`<${name}>\\s?([^<]+)`, "gi");

    result = result.replace(regex, (_, content) => {
      return `<span style="color:${color};font-weight:500;">${content}</span>`;
    });
  });

  // RAINBOW
  result = result.replace(/<rainbow>\s?([^<]+)/gi, (_, content) => {
    const rainbow = [
      "#ff3b30",
      "#ff9500",
      "#ffcc00",
      "#34c759",
      "#1d9bf0",
      "#af52de"
    ];

    return [...content]
      .map((char, i) => {
        if (char === " ") return " ";
        return `<span style="color:${rainbow[i % rainbow.length]};font-weight:600;">${char}</span>`;
      })
      .join("");
  });

  // NEON
  result = result.replace(/<neon>\s?([^<]+)/gi, (_, content) => {
    const neon = [
      "#ff3b30",
      "#ff9500",
      "#ffcc00",
      "#34c759",
      "#1d9bf0",
      "#af52de"
    ];

    return [...content]
      .map((char, i) => {
        if (char === " ") return " ";

        const color = neon[i % neon.length];

        return `<span style="
          color:${color};
          font-weight:600;
          text-shadow:
            0 0 5px ${color},
            0 0 10px ${color},
            0 0 20px ${color};
        ">${char}</span>`;
      })
      .join("");
  });

  return result;
}

window.applyColors = applyColors;
