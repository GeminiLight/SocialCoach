/**
 * Escape ASCII double quotes that appear *inside* JSON strings (a frequent LLM slip in Chinese
 * output, e.g. 被"事实"接住). A quote closes a string only if the next non-space character is a
 * structural token (, } ] :) or the end of input; otherwise it is treated as literal text.
 */
export function fixUnescapedQuotes(src: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (esc) {
      esc = false;
      out += ch;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && (src[j] === " " || src[j] === "\n" || src[j] === "\r" || src[j] === "\t")) j++;
      const next = src[j];
      if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
        inStr = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Best-effort parse of a JSON document that is still streaming in.
 * Closes any open string / array / object so the prefix becomes valid JSON,
 * dropping dangling keys or half-written numbers at the cut point.
 * Returns null when nothing parseable exists yet.
 */
export function parsePartialJSON<T = unknown>(text: string): Partial<T> | null {
  let s = text;
  const fence = s.indexOf("```");
  if (fence !== -1) s = s.slice(fence + 3).replace(/^json/i, "");
  const start = s.indexOf("{");
  if (start === -1) return null;
  s = fixUnescapedQuotes(s.slice(start));

  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let body = s;
  if (esc) body = body.slice(0, -1);
  if (inStr) body += '"';
  const closers = stack
    .slice()
    .reverse()
    .map((o) => (o === "{" ? "}" : "]"))
    .join("");

  const tryParse = (b: string): Partial<T> | null => {
    const candidate = b.replace(/,\s*$/, "") + closers;
    try {
      return JSON.parse(candidate) as Partial<T>;
    } catch {
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")) as Partial<T>;
      } catch {
        return null;
      }
    }
  };

  // Progressive repairs at the cut point, each applied to the previous result.
  const repairs: ((b: string) => string)[] = [
    (b) => b,
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*$/, ""), // dangling `"key":`
    (b) => b.replace(/(,|\{)\s*"(?:[^"\\]|\\.)*"\s*$/, "$1"), // dangling `"key` (no colon yet)
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*-?\d*\.?\d*$/, ""), // dangling `"key": 0.`
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*(true|false|null|tru|fals|nul|t|f|n|fa|tr|nu)?$/, ""), // dangling literal
    (b) => b.replace(/,\s*\{[^{}]*$/, ""), // drop a half-written object at the end of an array
  ];
  let cur = body;
  for (const r of repairs) {
    cur = r(cur).replace(/,\s*$/, "");
    const out = tryParse(cur);
    if (out) return out;
  }
  return null;
}
