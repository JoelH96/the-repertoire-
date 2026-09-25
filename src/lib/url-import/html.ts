const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  deg: "°",
  frac12: "½",
  frac13: "⅓",
  frac14: "¼",
  frac23: "⅔",
  frac34: "¾",
  times: "×",
  eacute: "é",
  egrave: "è",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  ccedil: "ç",
};

// JSON-LD strings are often still HTML-escaped (sometimes twice, e.g. "&amp;#39;").
export function decodeEntities(value: string): string {
  let out = value;
  for (let i = 0; i < 2 && /&[#a-z0-9]+;/i.test(out); i++) {
    out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (entity, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : entity;
      }
      return NAMED[code.toLowerCase()] ?? entity;
    });
  }
  return out;
}

export function htmlToText(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

// Reads <meta property|name="..." content="...">, whichever order the attributes are in.
export function metaContent(html: string, key: string): string {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];
    if (attr("property") === key || attr("name") === key) {
      return decodeEntities(attr("content") ?? "").trim();
    }
  }
  return "";
}
