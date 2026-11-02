/**
 * Two C/C++ header idioms whose preprocessor outcome is known without
 * evaluating anything, blanked out before parsing so that the grammar sees
 * the code the compiler sees:
 *
 * - the include guard (`#ifndef G` + `#define G` ... `#endif` around the
 *   whole file), which is always taken on the include being analyzed, and
 * - the C++ linkage guard (`#ifdef __cplusplus` / `extern "C" {` / `#endif`
 *   and its closing `}` twin), which only opens or closes a linkage block
 *   and declares nothing, and
 * - `#if 0` ... `#endif` without an `#else`, whose body is never compiled.
 *
 * Blanking replaces characters with spaces and keeps every newline, so all
 * line and column positions in the tree stay those of the original file.
 * Anything that does not match an idiom exactly is left as written, so the
 * normal conditional-compilation finding still covers it.
 */

// `%:` and `??=` (a digraph and a trigraph) also start a directive.
const DIRECTIVE = /^\s*(?:#|%:|\?\?=)\s*(\w+)\b(.*)$/;

/** The file with comments blanked and string literals kept, line by line. */
function codeLines(content: string): string[] {
  let out = "";
  let index = 0;
  while (index < content.length) {
    const char = content[index] as string;
    const next = content[index + 1];
    if (char === "/" && next === "*") {
      const end = content.indexOf("*/", index + 2);
      const stop = end === -1 ? content.length : end + 2;
      out += content.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
    } else if (char === "/" && next === "/") {
      // A backslash at the end of the line continues the comment.
      let stop = index;
      for (;;) {
        stop = content.indexOf("\n", stop);
        if (stop === -1) {
          stop = content.length;
          break;
        }
        if (!/\\\r?$/.test(content.slice(index, stop))) break;
        stop += 1;
      }
      out += content.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
    } else if (char === '"' || char === "'") {
      let stop = index + 1;
      while (
        stop < content.length &&
        content[stop] !== char &&
        content[stop] !== "\n"
      ) {
        stop += content[stop] === "\\" ? 2 : 1;
      }
      stop = Math.min(stop + 1, content.length);
      out += content.slice(index, stop);
      index = stop;
    } else {
      out += char;
      index += 1;
    }
  }
  return out.split("\n");
}

interface Directive {
  readonly line: number;
  readonly name: string;
  readonly rest: string;
}

function directiveAt(code: readonly string[], line: number) {
  const match = DIRECTIVE.exec((code[line] as string).replace(/\r$/, ""));
  if (match === null) return undefined;
  return {
    line,
    name: match[1] as string,
    rest: (match[2] as string).trim(),
  } satisfies Directive;
}

const OPENS = new Set(["if", "ifdef", "ifndef"]);

/**
 * The line of the `#endif` closing the conditional opened at `open`, or
 * undefined when it has an `#else`/`#elif` branch or never closes, or when a
 * directive line continues with a backslash.
 */
function plainEndif(code: readonly string[], open: number) {
  let depth = 0;
  for (let line = open; line < code.length; line += 1) {
    const directive = directiveAt(code, line);
    if (directive === undefined) continue;
    if (directive.rest.endsWith("\\")) return undefined;
    if (OPENS.has(directive.name)) depth += 1;
    else if (directive.name === "endif") {
      depth -= 1;
      if (depth === 0) return line;
    } else if (
      depth === 1 &&
      ["else", "elif", "elifdef", "elifndef"].includes(directive.name)
    ) {
      return undefined;
    }
  }
  return undefined;
}

const GUARD_OPEN =
  /^(?:ifndef\s+([A-Za-z_]\w*)|if\s+!\s*defined\s*(?:\(\s*([A-Za-z_]\w*)\s*\)|([A-Za-z_]\w*)))$/;
const CPLUSPLUS_OPEN =
  /^(?:ifdef\s+__cplusplus|if\s+defined\s*(?:\(\s*__cplusplus\s*\)|__cplusplus))$/;

function blankLines(lines: string[], from: number, to: number): void {
  for (let line = from; line <= to; line += 1) {
    lines[line] = (lines[line] as string).replace(/[^\r]/g, " ");
  }
}

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim().length === 0;
}

// implements REQ-kibi-tree-sitter-language-packs
export function blankHeaderIdioms(content: string): string {
  const code = codeLines(content);
  const lines = content.split("\n");
  const used = code
    .map((line, index) => (isBlank(line) ? -1 : index))
    .filter((index) => index >= 0);
  // Include guard: the first code line opens it, the second defines the
  // guard name and the last code line is its own `#endif`.
  const first = used[0];
  const second = used[1];
  const last = used.at(-1);
  if (first !== undefined && second !== undefined && last !== undefined) {
    const open = directiveAt(code, first);
    const guard =
      open === undefined
        ? undefined
        : GUARD_OPEN.exec(`${open.name} ${open.rest}`.trim());
    const name = guard?.[1] ?? guard?.[2] ?? guard?.[3];
    const define = directiveAt(code, second);
    // The guard's own `#define G` (or `G 1`, `G G`) defines nothing the code uses;
    // a guard name with any other body is a macro of the file.
    const words = define?.rest.split(/\s+/) ?? [];
    if (
      name !== undefined &&
      define?.name === "define" &&
      words[0] === name &&
      (words.length === 1 || (words.length === 2 && (words[1] === "1" || words[1] === name))) &&
      !define.rest.endsWith("\\") &&
      plainEndif(code, first) === last
    ) {
      blankLines(lines, first, first);
      blankLines(lines, second, second);
      blankLines(lines, last, last);
    }
  }
  // Linkage guards: `#ifdef __cplusplus`, one line `extern "C" {` or `}`,
  // then `#endif`.
  for (let line = 0; line < code.length; line += 1) {
    const open = directiveAt(code, line);
    if (open === undefined) continue;
    const condition = `${open.name} ${open.rest}`.trim();
    const disabled = condition === "if 0";
    if (!disabled && !CPLUSPLUS_OPEN.test(condition)) continue;
    const endif = plainEndif(code, line);
    if (endif === undefined) continue;
    if (disabled) {
      blankLines(lines, line, endif);
      line = endif;
      continue;
    }
    const body = code
      .slice(line + 1, endif)
      .filter((entry) => !isBlank(entry))
      .map((entry) => entry.replace(/\s+/g, " ").trim());
    if (
      body.length === 1 &&
      ['extern "C" {', 'extern "C"{', "}"].includes(body[0] as string)
    ) {
      blankLines(lines, line, endif);
      line = endif;
    }
  }
  return lines.join("\n");
}
