/* Whitelist sanitizer for rich-text lesson content. Rich text renders
   unescaped in the student reader, so a compromised instructor account
   must not be able to plant script there. */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "s", "u", "code", "pre",
  "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "a", "img", "hr",
  "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "span",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
  col: new Set(["span"]),
};

export function sanitizeHtml(input: string): string {
  let html = input;

  // Remove containers wholesale.
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, "");

  // Walk remaining tags: drop unknown tags, scrub attributes.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*?)?)(\/?)>/g, (m, tag, attrs, selfClose) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return "";
    if (m.startsWith("</")) return `</${t}>`;

    const allowed = ALLOWED_ATTRS[t];
    let clean = "";
    if (allowed && attrs) {
      const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = re.exec(attrs))) {
        const name = a[1].toLowerCase();
        const value = (a[3] ?? a[4] ?? "").trim();
        if (!allowed.has(name)) continue;
        if (name === "href" || name === "src") {
          const v = value.toLowerCase().replace(/\s/g, "");
          if (v.startsWith("javascript:") || v.startsWith("data:text")) continue;
        }
        clean += ` ${name}="${value.replace(/"/g, "&quot;")}"`;
      }
      if (t === "a") clean += ' rel="noopener noreferrer"';
    }
    return `<${t}${clean}${selfClose ? " /" : ""}>`;
  });

  return html.trim();
}
