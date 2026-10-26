/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Exact decisions about the languages of regular expressions, for the regex
 * proof kind. A pattern is parsed into a regular expression over UTF-16 code
 * units, compiled to an NFA, and compared with another by exploring the
 * product of their lazily determinized automata. Every answer is a decision,
 * not a sample: two patterns are equivalent only when no string tells them
 * apart, and a "no" comes with the shortest string that does.
 *
 * Only the regular part of the syntax is accepted. Backreferences,
 * lookaround, word boundaries, inline flags, Unicode property escapes and the
 * stateful or line-based flags (g, y, m, v; Python MULTILINE, VERBOSE,
 * LOCALE) are refused with a reason, so a pattern Kibi cannot model exactly
 * never earns an answer.
 *
 * Strings are well-formed UTF-16 text: every string Kibi compares is a
 * sequence of Unicode scalar values (no lone surrogates). A JavaScript
 * pattern without the u flag still works on code units, so it may match half
 * of a surrogate pair inside such a string, and that is modeled.
 */

/** Which engine's syntax and semantics a pattern follows. */
// implements REQ-kibi-non-numeric-proof-kinds
export type RegexFlavor = "js" | "python";

/** How a pattern is applied to a string. */
// implements REQ-kibi-non-numeric-proof-kinds
export type MatchMode =
  /** RegExp.prototype.test and Python re.search: a match anywhere counts. */
  | "search"
  /** The whole string must match (a fact's pattern). */
  | "full";

/** A pattern as a language: its source, flags, flavor and how it is applied. */
// implements REQ-kibi-non-numeric-proof-kinds
export type PatternSpec = Readonly<{
  source: string;
  flags?: string;
  flavor: RegexFlavor;
  mode: MatchMode;
}>;

/** A language Kibi can compare: a pattern, or exactly one string. */
// implements REQ-kibi-non-numeric-proof-kinds
export type LanguageSpec =
  | (PatternSpec & { type: "pattern" })
  | Readonly<{ type: "literal"; value: string }>;

type Interval = readonly [number, number];
type Ranges = Interval[];

const MAX_UNIT = 0xffff;
const MAX_CODE_POINT = 0x10ffff;
const MAX_NFA_STATES = 20_000;
const MAX_PRODUCT_STATES = 50_000;

/** A pattern Kibi refuses to model; the message says why. */
export class UnsupportedPattern extends Error {}

// ---------------------------------------------------------------------------
// Code point sets

function normalize(ranges: readonly Interval[]): Ranges {
  const sorted = [...ranges]
    .filter(([lo, hi]) => lo <= hi)
    .sort((a, b) => a[0] - b[0]);
  const out: Ranges = [];
  for (const [lo, hi] of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && lo <= last[1] + 1)
      out[out.length - 1] = [last[0], Math.max(last[1], hi)];
    else out.push([lo, hi]);
  }
  return out;
}

function complement(ranges: readonly Interval[], max: number): Ranges {
  const out: Ranges = [];
  let next = 0;
  for (const [lo, hi] of normalize(ranges)) {
    if (lo > next) out.push([next, lo - 1]);
    next = hi + 1;
  }
  if (next <= max) out.push([next, max]);
  return out;
}

function single(code: number): Ranges {
  return [[code, code]];
}

const DIGIT: Ranges = [[0x30, 0x39]];
const WORD: Ranges = normalize([
  [0x30, 0x39],
  [0x41, 0x5a],
  [0x5f, 0x5f],
  [0x61, 0x7a],
]);
const JS_SPACE: Ranges = normalize([
  [0x09, 0x0d],
  [0x20, 0x20],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
]);
const PYTHON_ASCII_SPACE: Ranges = normalize([
  [0x09, 0x0d],
  [0x20, 0x20],
]);
// str.isspace(): bidirectional types WS, B and S, and category Zs.
const PYTHON_UNICODE_SPACE: Ranges = normalize([
  [0x09, 0x0d],
  [0x1c, 0x20],
  [0x85, 0x85],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
]);
const JS_LINE_TERMINATORS: Ranges = normalize([
  [0x0a, 0x0a],
  [0x0d, 0x0d],
  [0x2028, 0x2029],
]);

/**
 * The characters equal to an ASCII letter under case-insensitive matching,
 * beyond its ASCII partner: JavaScript with the u flag folds U+017F to s
 * and U+212A to k (simple case folding); Python's Unicode IGNORECASE also
 * treats U+0130 and U+0131 as i (its documented four extra letters).
 */
function caseExtras(flavor: RegexFlavor, unicode: boolean, ascii: boolean) {
  const extras = new Map<number, number[]>();
  if (!unicode || ascii) return extras;
  const add = (letter: string, ...codes: number[]) => {
    for (const variant of [letter.toLowerCase(), letter.toUpperCase()])
      extras.set(variant.charCodeAt(0), codes);
  };
  add("s", 0x017f);
  add("k", 0x212a);
  if (flavor === "python") add("i", 0x0130, 0x0131);
  return extras;
}

type Syntax = Readonly<{
  flavor: RegexFlavor;
  /** Code point semantics (JS u flag, every Python str pattern). */
  unicode: boolean;
  ignoreCase: boolean;
  dotAll: boolean;
  /** Python re.ASCII. */
  ascii: boolean;
}>;

/**
 * A character with no case variants: no other character upper- or
 * lower-cases to it, so every engine's case folding leaves it alone.
 */
function caseless(code: number): boolean {
  const char = String.fromCodePoint(code);
  return char.toUpperCase() === char && char.toLowerCase() === char;
}

function caseClosed(ranges: Ranges, syntax: Syntax): Ranges {
  if (!syntax.ignoreCase) return ranges;
  const extras = caseExtras(syntax.flavor, syntax.unicode, syntax.ascii);
  const added: Interval[] = [];
  for (const [lo, hi] of ranges) {
    for (let code = Math.max(lo, 0x41); code <= Math.min(hi, 0x7a); code++) {
      if (code >= 0x41 && code <= 0x5a) added.push([code + 32, code + 32]);
      else if (code >= 0x61 && code <= 0x7a) added.push([code - 32, code - 32]);
      for (const extra of extras.get(code) ?? []) added.push([extra, extra]);
    }
    for (const [letter, codes] of extras)
      for (const extra of codes)
        if (extra >= lo && extra <= hi) {
          added.push([letter, letter]);
          for (const other of codes) added.push([other, other]);
        }
  }
  return normalize([...ranges, ...added]);
}

// ---------------------------------------------------------------------------
// Parsing

type Node =
  | Readonly<{ type: "set"; ranges: Ranges }>
  | Readonly<{ type: "seq"; items: Node[] }>
  | Readonly<{ type: "alt"; items: Node[] }>
  | Readonly<{ type: "repeat"; item: Node; min: number; max: number }>
  | Readonly<{ type: "assert"; kind: "bol" | "eol" | "eolnl" }>;

function syntaxOf(spec: PatternSpec): Syntax {
  const flags = spec.flags ?? "";
  const allowed = spec.flavor === "js" ? "disu" : "iasu";
  for (const flag of flags) {
    if (!allowed.includes(flag))
      throw new UnsupportedPattern(
        spec.flavor === "js"
          ? `the ${flag} flag is not supported (g and y make test() depend on lastIndex, m makes ^ and $ match at every line, v changes class syntax)`
          : `the Python flag ${flag} is not supported (MULTILINE, VERBOSE and LOCALE change what the pattern means)`,
      );
  }
  return {
    flavor: spec.flavor,
    unicode: spec.flavor === "python" || flags.includes("u"),
    ignoreCase: flags.includes("i"),
    dotAll: flags.includes("s"),
    ascii: spec.flavor === "python" && flags.includes("a"),
  };
}

class Parser {
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly syntax: Syntax,
  ) {}

  parse(): Node {
    const node = this.alternation();
    if (this.index < this.source.length)
      throw new UnsupportedPattern(
        `unexpected ${JSON.stringify(this.source[this.index])} at offset ${this.index}`,
      );
    return node;
  }

  private peek(offset = 0): string | undefined {
    return this.source[this.index + offset];
  }

  private fail(message: string): never {
    throw new UnsupportedPattern(`${message} (at offset ${this.index})`);
  }

  private alternation(): Node {
    const items = [this.sequence()];
    while (this.peek() === "|") {
      this.index++;
      items.push(this.sequence());
    }
    return items.length === 1 ? (items[0] as Node) : { type: "alt", items };
  }

  private sequence(): Node {
    const items: Node[] = [];
    while (this.index < this.source.length) {
      const char = this.peek();
      if (char === "|" || char === ")") break;
      const atom = this.atom();
      items.push(this.quantified(atom));
    }
    return { type: "seq", items };
  }

  /** A counted quantifier at `index`: its bounds and length, or null. */
  private counted(): { min: number; max: number; length: number } | null {
    const rest = this.source.slice(this.index);
    const match =
      this.syntax.flavor === "python"
        ? /^\{(\d*)(?:(,)(\d*))?\}/.exec(rest)
        : /^\{(\d+)(?:(,)(\d*))?\}/.exec(rest);
    if (match === null || (match[1] === "" && match[2] === undefined)) return null;
    if (match[1] === "" && match[3] === "")
      this.fail("a {,} quantifier");
    const min = match[1] === "" ? 0 : Number(match[1]);
    const max =
      match[2] === undefined
        ? min
        : match[3] === ""
          ? Number.POSITIVE_INFINITY
          : Number(match[3]);
    return { min, max, length: match[0].length };
  }

  private quantified(atom: Node): Node {
    const char = this.peek();
    let min: number;
    let max: number;
    if (char === "*") [min, max] = [0, Number.POSITIVE_INFINITY];
    else if (char === "+") [min, max] = [1, Number.POSITIVE_INFINITY];
    else if (char === "?") [min, max] = [0, 1];
    else if (char === "{") {
      const bounds = this.counted();
      if (bounds === null) {
        if (this.syntax.flavor === "js" && this.syntax.unicode)
          this.fail("a { that does not start a quantifier");
        return atom;
      }
      ({ min, max } = bounds);
      if (max < min) this.fail("a quantifier whose maximum is below its minimum");
      if (min > 1000 || (Number.isFinite(max) && max > 1000))
        this.fail("a counted repeat above 1000");
      this.index += bounds.length - 1;
    } else return atom;
    if (atom.type === "assert") this.fail("a quantified assertion");
    this.index++;
    const lazy = this.peek();
    if (lazy === "?") this.index++;
    else if (lazy === "+" && this.syntax.flavor === "python")
      this.fail("a possessive quantifier");
    const after = this.peek();
    if (
      after === "*" ||
      after === "+" ||
      after === "?" ||
      (after === "{" && this.counted() !== null)
    )
      this.fail("a quantifier on a quantifier");
    return { type: "repeat", item: atom, min, max };
  }

  private atom(): Node {
    const char = this.peek() as string;
    if (char === "(") return this.group();
    if (char === "[") return { type: "set", ranges: this.characterClass() };
    if (char === ".") {
      this.index++;
      const excluded = this.syntax.dotAll
        ? []
        : this.syntax.flavor === "js"
          ? JS_LINE_TERMINATORS
          : single(0x0a);
      return { type: "set", ranges: complement(excluded, this.maxChar()) };
    }
    if (char === "^") {
      this.index++;
      return { type: "assert", kind: "bol" };
    }
    if (char === "$") {
      this.index++;
      return {
        type: "assert",
        kind: this.syntax.flavor === "python" ? "eolnl" : "eol",
      };
    }
    if (char === "\\") return this.escapeAtom();
    if (char === "*" || char === "+" || char === "?")
      this.fail("a quantifier with nothing to repeat");
    if (char === "{" && this.counted() !== null)
      this.fail("a quantifier with nothing to repeat");
    if (char === "]" && this.syntax.flavor === "js" && this.syntax.unicode)
      this.fail("a lone ]");
    if (char === "}" && this.syntax.flavor === "js" && this.syntax.unicode)
      this.fail("a lone }");
    const code = this.readLiteral();
    return { type: "set", ranges: this.literalSet(code) };
  }

  private maxChar(): number {
    return this.syntax.unicode ? MAX_CODE_POINT : MAX_UNIT;
  }

  private readLiteral(): number {
    const code = this.syntax.unicode
      ? (this.source.codePointAt(this.index) as number)
      : this.source.charCodeAt(this.index);
    this.index += code > 0xffff ? 2 : 1;
    return code;
  }

  private literalSet(code: number): Ranges {
    if (this.syntax.ignoreCase && code > 0x7f && !caseless(code))
      this.fail(
        "a non-ASCII letter under case-insensitive matching (Kibi folds case exactly only for ASCII letters)",
      );
    return caseClosed(single(code), this.syntax);
  }

  private group(): Node {
    this.index++;
    if (this.peek() === "?") {
      const rest = this.source.slice(this.index);
      if (rest.startsWith("?:")) this.index += 2;
      else if (/^\?P?<[A-Za-z_][A-Za-z0-9_]*>/.test(rest)) {
        if (rest.startsWith("?P") && this.syntax.flavor !== "python")
          this.fail("a (?P<name>) group outside Python");
        if (rest.startsWith("?<") && this.syntax.flavor === "python")
          this.fail("a (?<name>) group in Python");
        this.index += rest.indexOf(">") + 1;
      } else if (/^\?<?[=!]/.test(rest))
        this.fail("lookaround (Kibi decides only regular languages)");
      else if (rest.startsWith("?P=") || rest.startsWith("?("))
        this.fail("a backreference or conditional group");
      else this.fail("an inline flag, comment or atomic group");
    }
    const inner = this.alternation();
    if (this.peek() !== ")") this.fail("an unclosed group");
    this.index++;
    return inner;
  }

  private escapeAtom(): Node {
    const next = this.peek(1);
    if (next === undefined) this.fail("a trailing backslash");
    if (next === "b" || next === "B")
      this.fail("a word boundary (Kibi decides only regular languages)");
    if (/[1-9]/.test(next) || next === "k")
      this.fail("a backreference (Kibi decides only regular languages)");
    if (this.syntax.flavor === "python" && (next === "A" || next === "Z")) {
      this.index += 2;
      return { type: "assert", kind: next === "A" ? "bol" : "eol" };
    }
    const escaped = this.escape(false);
    return {
      type: "set",
      ranges: "code" in escaped ? this.literalSet(escaped.code) : escaped.ranges,
    };
  }

  /**
   * One escape after the backslash at `index`, advancing past it: a single
   * character (its code, not yet case-folded) or a class escape's set.
   */
  private escape(inClass: boolean): { code: number } | { ranges: Ranges } {
    this.index++;
    const char = this.peek() as string;
    this.index++;
    const code = (value: number) => ({ code: value });
    switch (char) {
      case "d":
      case "D":
      case "w":
      case "W":
      case "s":
      case "S":
        return { ranges: this.classEscape(char) };
      case "t":
        return code(0x09);
      case "n":
        return code(0x0a);
      case "r":
        return code(0x0d);
      case "v":
        return code(0x0b);
      case "f":
        return code(0x0c);
      case "a":
        if (this.syntax.flavor === "python") return code(0x07);
        break;
      case "b":
        if (inClass) return code(0x08);
        break;
      case "0":
        if (!/[0-9]/.test(this.peek() ?? "")) return code(0);
        this.fail("an octal escape");
        break;
      case "x": {
        const hex = /^[0-9A-Fa-f]{2}/.exec(this.source.slice(this.index));
        if (hex === null) this.fail("a malformed \\x escape");
        this.index += 2;
        return code(Number.parseInt(hex[0], 16));
      }
      case "u": {
        const rest = this.source.slice(this.index);
        const braced = /^\{([0-9A-Fa-f]{1,6})\}/.exec(rest);
        if (braced !== null && this.syntax.flavor === "js" && this.syntax.unicode) {
          this.index += braced[0].length;
          const value = Number.parseInt(braced[1] as string, 16);
          if (value > MAX_CODE_POINT) this.fail("a code point above U+10FFFF");
          return code(value);
        }
        const hex = /^[0-9A-Fa-f]{4}/.exec(rest);
        if (hex === null) this.fail("a malformed \\u escape");
        this.index += 4;
        let value = Number.parseInt(hex[0], 16);
        // In u mode a \u escape pair spells one astral code point.
        const low = /^\\u(D[C-F][0-9A-F]{2})/i.exec(this.source.slice(this.index));
        if (
          this.syntax.flavor === "js" &&
          this.syntax.unicode &&
          value >= 0xd800 &&
          value <= 0xdbff &&
          low !== null
        ) {
          this.index += 6;
          value =
            0x10000 +
            ((value - 0xd800) << 10) +
            (Number.parseInt(low[1] as string, 16) - 0xdc00);
        }
        return code(value);
      }
      case "U":
        if (this.syntax.flavor === "python") {
          const hex = /^[0-9A-Fa-f]{8}/.exec(this.source.slice(this.index));
          if (hex === null) this.fail("a malformed \\U escape");
          this.index += 8;
          const value = Number.parseInt(hex[0], 16);
          if (value > MAX_CODE_POINT) this.fail("a code point above U+10FFFF");
          return code(value);
        }
        break;
      case "c":
        if (this.syntax.flavor === "js") {
          const letter = this.peek() ?? "";
          if (/[A-Za-z]/.test(letter)) {
            this.index++;
            return code(letter.charCodeAt(0) % 32);
          }
        }
        break;
      case "p":
      case "P":
        this.fail("a Unicode property escape");
        break;
      case "N":
        if (this.syntax.flavor === "python") this.fail("a \\N{name} escape");
        break;
      default:
        break;
    }
    // An identity escape: a syntax character stands for itself (in Python
    // any ASCII punctuation does); any other escape is one Kibi does not
    // model.
    if (/[\^$\\.*+?()[\]{}|/\-]/.test(char)) return code(char.charCodeAt(0));
    if (
      this.syntax.flavor === "python" &&
      /[^A-Za-z0-9]/.test(char) &&
      char.charCodeAt(0) < 0x80
    )
      return code(char.charCodeAt(0));
    this.index--;
    return this.fail(`the escape \\${char}`);
  }

  private classEscape(char: string): Ranges {
    const lower = char.toLowerCase();
    let base: Ranges;
    if (this.syntax.flavor === "python" && !this.syntax.ascii) {
      if (lower === "s") base = PYTHON_UNICODE_SPACE;
      else
        this.fail(
          `\\${char} in a Python str pattern matches any Unicode ${lower === "d" ? "digit" : "word character"}; use an explicit class or re.ASCII`,
        );
    } else if (lower === "d") base = DIGIT;
    else if (lower === "w") base = WORD;
    else
      base = this.syntax.flavor === "python" ? PYTHON_ASCII_SPACE : JS_SPACE;
    const closed = caseClosed(base, this.syntax);
    return char === lower ? closed : complement(closed, this.maxChar());
  }

  private characterClass(): Ranges {
    this.index++;
    let negated = false;
    if (this.peek() === "^") {
      negated = true;
      this.index++;
    }
    const ranges: Interval[] = [];
    let first = true;
    for (;;) {
      const char = this.peek();
      if (char === undefined) this.fail("an unclosed character class");
      if (char === "]" && !(first && this.syntax.flavor === "python")) {
        this.index++;
        break;
      }
      first = false;
      if (
        char === "[" &&
        this.syntax.flavor === "python" &&
        /^\[[:=.]/.test(this.source.slice(this.index))
      )
        this.fail("a POSIX class");
      const start = this.classAtom();
      if (
        this.peek() === "-" &&
        this.peek(1) !== undefined &&
        this.peek(1) !== "]"
      ) {
        this.index++;
        const end = this.classAtom();
        if (start.single === null || end.single === null) {
          if (this.syntax.unicode)
            this.fail("a class escape as a range endpoint");
          // Without u, JavaScript reads [\d-x] as \d, - and x.
          ranges.push(...start.ranges, ...this.literalSet(0x2d), ...end.ranges);
          continue;
        }
        if (end.single < start.single) this.fail("a range out of order");
        if (this.syntax.ignoreCase && end.single > 0x7f)
          this.fail(
            "a non-ASCII range under case-insensitive matching (Kibi folds case exactly only for ASCII letters)",
          );
        ranges.push(...caseClosed([[start.single, end.single]], this.syntax));
      } else ranges.push(...start.ranges);
    }
    const set = normalize(ranges);
    return negated ? complement(set, this.maxChar()) : set;
  }

  private classAtom(): { ranges: Ranges; single: number | null } {
    if (this.peek() === "\\") {
      if (this.peek(1) === "B") this.fail("\\B inside a class");
      const escaped = this.escape(true);
      return "code" in escaped
        ? { ranges: this.literalSet(escaped.code), single: escaped.code }
        : { ranges: escaped.ranges, single: null };
    }
    const value = this.readLiteral();
    return { ranges: this.literalSet(value), single: value };
  }
}

// ---------------------------------------------------------------------------
// NFA over UTF-16 code units

type Edge =
  | Readonly<{ type: "eps"; to: number }>
  | Readonly<{ type: "units"; ranges: Ranges; to: number }>
  | Readonly<{ type: "assert"; kind: "bol" | "eol" | "eolnl"; to: number }>;

class Nfa {
  readonly edges: Edge[][] = [];

  state(): number {
    if (this.edges.length >= MAX_NFA_STATES)
      throw new UnsupportedPattern(
        `the pattern needs more than ${MAX_NFA_STATES} automaton states`,
      );
    this.edges.push([]);
    return this.edges.length - 1;
  }

  add(from: number, edge: Edge): void {
    (this.edges[from] as Edge[]).push(edge);
  }
}

/** Code point ranges as UTF-16 code unit paths from `from` to `to`. */
function addCodePoints(
  nfa: Nfa,
  from: number,
  to: number,
  ranges: Ranges,
  unicode: boolean,
): void {
  if (!unicode) {
    const units = normalize(ranges.map(([lo, hi]) => [lo, Math.min(hi, MAX_UNIT)] as Interval));
    if (units.length > 0) nfa.add(from, { type: "units", ranges: units, to });
    return;
  }
  // Lone surrogates never occur in well-formed strings, so a code point set
  // keeps only scalar values: BMP ranges as one unit, astral ones as pairs.
  const bmp: Interval[] = [];
  const astral: Interval[] = [];
  for (const [lo, hi] of ranges) {
    if (lo <= 0xd7ff) bmp.push([lo, Math.min(hi, 0xd7ff)]);
    if (hi >= 0xe000 && lo <= 0xffff) bmp.push([Math.max(lo, 0xe000), Math.min(hi, 0xffff)]);
    if (hi >= 0x10000) astral.push([Math.max(lo, 0x10000), hi]);
  }
  const units = normalize(bmp);
  if (units.length > 0) nfa.add(from, { type: "units", ranges: units, to });
  for (const [lo, hi] of normalize(astral)) {
    const highOf = (code: number) => 0xd800 + ((code - 0x10000) >> 10);
    const lowOf = (code: number) => 0xdc00 + ((code - 0x10000) & 0x3ff);
    const pair = (highLo: number, highHi: number, lowLo: number, lowHi: number) => {
      const mid = nfa.state();
      nfa.add(from, { type: "units", ranges: [[highLo, highHi]], to: mid });
      nfa.add(mid, { type: "units", ranges: [[lowLo, lowHi]], to });
    };
    const firstHigh = highOf(lo);
    const lastHigh = highOf(hi);
    if (firstHigh === lastHigh) {
      pair(firstHigh, firstHigh, lowOf(lo), lowOf(hi));
      continue;
    }
    pair(firstHigh, firstHigh, lowOf(lo), 0xdfff);
    if (lastHigh - firstHigh > 1) pair(firstHigh + 1, lastHigh - 1, 0xdc00, 0xdfff);
    pair(lastHigh, lastHigh, 0xdc00, lowOf(hi));
  }
}

function build(nfa: Nfa, node: Node, from: number, to: number, unicode: boolean): void {
  switch (node.type) {
    case "set":
      addCodePoints(nfa, from, to, node.ranges, unicode);
      return;
    case "assert":
      nfa.add(from, { type: "assert", kind: node.kind, to });
      return;
    case "seq": {
      let current = from;
      node.items.forEach((item, index) => {
        const next = index === node.items.length - 1 ? to : nfa.state();
        build(nfa, item, current, next, unicode);
        current = next;
      });
      if (node.items.length === 0) nfa.add(from, { type: "eps", to });
      return;
    }
    case "alt":
      for (const item of node.items) build(nfa, item, from, to, unicode);
      return;
    case "repeat": {
      let current = from;
      for (let count = 0; count < node.min; count++) {
        const next = nfa.state();
        build(nfa, node.item, current, next, unicode);
        current = next;
      }
      if (node.max === Number.POSITIVE_INFINITY) {
        const loop = nfa.state();
        nfa.add(current, { type: "eps", to: loop });
        const back = nfa.state();
        build(nfa, node.item, loop, back, unicode);
        nfa.add(back, { type: "eps", to: loop });
        nfa.add(loop, { type: "eps", to });
        return;
      }
      for (let count = node.min; count < node.max; count++) {
        const next = nfa.state();
        nfa.add(current, { type: "eps", to });
        build(nfa, node.item, current, next, unicode);
        current = next;
      }
      nfa.add(current, { type: "eps", to });
      return;
    }
  }
}

type Compiled = Readonly<{
  nfa: Nfa;
  start: number;
  accept: number;
  mode: MatchMode;
}>;

/** Compile a language to an NFA over UTF-16 code units, or refuse it. */
// implements REQ-kibi-non-numeric-proof-kinds
export function compileLanguage(spec: LanguageSpec): Compiled {
  const nfa = new Nfa();
  const start = nfa.state();
  const accept = nfa.state();
  if (spec.type === "literal") {
    let current = start;
    for (let index = 0; index < spec.value.length; index++) {
      const next = index === spec.value.length - 1 ? accept : nfa.state();
      const unit = spec.value.charCodeAt(index);
      nfa.add(current, { type: "units", ranges: [[unit, unit]], to: next });
      current = next;
    }
    if (spec.value.length === 0) nfa.add(start, { type: "eps", to: accept });
    return { nfa, start, accept, mode: "full" };
  }
  const syntax = syntaxOf(spec);
  const tree = new Parser(spec.source, syntax).parse();
  build(nfa, tree, start, accept, syntax.unicode);
  return { nfa, start, accept, mode: spec.mode };
}

// ---------------------------------------------------------------------------
// Lazy determinization

// A configuration is an NFA state and what the rest of the input must be:
// anything (0), empty or a single "\n" (1, after Python's $), or empty (2).
type Config = number;
const FREE = 0;
const NEWLINE_OR_END = 1;
const END = 2;

const ACCEPTED = "*";

class Determinizer {
  private readonly ids = new Map<string, number>();
  readonly keys: string[] = [];
  private readonly sets: Config[][] = [];
  private readonly flags: { accepted: boolean; atEnd: boolean; atNewline: boolean }[] = [];
  private readonly moves = new Map<string, number>();

  constructor(private readonly compiled: Compiled) {}

  initial(): number {
    return this.intern(this.closure([this.config(this.compiled.start, FREE)], true), false, false);
  }

  private config(state: number, constraint: number): Config {
    return state * 3 + constraint;
  }

  private closure(seed: Config[], atStart: boolean): Config[] {
    const seen = new Set<Config>(seed);
    const stack = [...seed];
    while (stack.length > 0) {
      const config = stack.pop() as Config;
      const state = Math.floor(config / 3);
      const constraint = config % 3;
      for (const edge of this.compiled.nfa.edges[state] ?? []) {
        let next: Config | null = null;
        if (edge.type === "eps") next = this.config(edge.to, constraint);
        else if (edge.type === "assert") {
          if (edge.kind === "bol") next = atStart ? this.config(edge.to, constraint) : null;
          else if (edge.kind === "eol") next = this.config(edge.to, END);
          else next = this.config(edge.to, Math.max(constraint, NEWLINE_OR_END));
        }
        if (next !== null && !seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return [...seen].sort((a, b) => a - b);
  }

  /**
   * Intern a closed configuration set. Reaching the accept state settles the
   * outcome: in search mode an unconstrained match accepts every extension;
   * a constrained one (or any full match) accepts only when the rest of the
   * input is what the constraint allows.
   */
  private intern(configs: Config[], atEnd: boolean, atNewline: boolean): number {
    let accepted = false;
    let endHere = atEnd;
    let newlineHere = atNewline;
    const live: Config[] = [];
    for (const config of configs) {
      const state = Math.floor(config / 3);
      const constraint = config % 3;
      if (state === this.compiled.accept) {
        if (this.compiled.mode === "full" || constraint === END) endHere = true;
        else if (constraint === NEWLINE_OR_END) newlineHere = true;
        else accepted = true;
      }
      if (constraint === END) continue;
      live.push(config);
    }
    const key = accepted
      ? ACCEPTED
      : `${live.join(",")}|${endHere ? 1 : 0}${newlineHere ? 1 : 0}`;
    const existing = this.ids.get(key);
    if (existing !== undefined) return existing;
    const id = this.keys.length;
    this.ids.set(key, id);
    this.keys.push(key);
    this.sets.push(accepted ? [] : live);
    this.flags.push({ accepted, atEnd: endHere, atNewline: newlineHere });
    if (id >= MAX_PRODUCT_STATES)
      throw new UnsupportedPattern("the pattern's automaton grew too large to decide");
    return id;
  }

  accepts(id: number): boolean {
    const flag = this.flags[id];
    return flag !== undefined && (flag.accepted || flag.atEnd || flag.atNewline);
  }

  step(id: number, unit: number): number {
    const memo = `${id}:${unit}`;
    const known = this.moves.get(memo);
    if (known !== undefined) return known;
    const flag = this.flags[id] as { accepted: boolean; atNewline: boolean };
    let result: number;
    if (flag.accepted) result = id;
    else {
      const next: Config[] = [];
      for (const config of this.sets[id] ?? []) {
        const state = Math.floor(config / 3);
        const constraint = config % 3;
        if (constraint === NEWLINE_OR_END && unit !== 0x0a) continue;
        const after = constraint === NEWLINE_OR_END ? END : constraint;
        for (const edge of this.compiled.nfa.edges[state] ?? [])
          if (edge.type === "units" && contains(edge.ranges, unit))
            next.push(this.config(edge.to, after));
      }
      // Search mode starts a new attempt at every position.
      if (this.compiled.mode === "search") next.push(this.config(this.compiled.start, FREE));
      const atEnd = flag.atNewline && unit === 0x0a;
      result = this.intern(this.closure(next, false), atEnd, false);
    }
    this.moves.set(memo, result);
    return result;
  }

  /** The unit boundaries the automaton distinguishes. */
  boundaries(into: Set<number>): void {
    for (const edges of this.compiled.nfa.edges)
      for (const edge of edges)
        if (edge.type === "units")
          for (const [lo, hi] of edge.ranges) {
            into.add(lo);
            into.add(hi + 1);
          }
    into.add(0x0a);
    into.add(0x0b);
  }
}

function contains(ranges: Ranges, unit: number): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = ranges[mid] as Interval;
    if (unit < start) hi = mid - 1;
    else if (unit > end) lo = mid + 1;
    else return true;
  }
  return false;
}

/** One representative unit per class of units no automaton tells apart. */
function minterms(automata: readonly Determinizer[]): number[] {
  const cuts = new Set<number>([0, 0xd800, 0xdc00, 0xe000, MAX_UNIT + 1]);
  for (const automaton of automata) automaton.boundaries(cuts);
  const sorted = [...cuts].filter((cut) => cut <= MAX_UNIT + 1).sort((a, b) => a - b);
  const representatives: number[] = [];
  for (let index = 0; index < sorted.length - 1; index++) {
    const lo = sorted[index] as number;
    const hi = (sorted[index + 1] as number) - 1;
    // Prefer a printable character so a counterexample reads well.
    const printable = [0x61, 0x41, 0x30, 0x20].find((code) => code >= lo && code <= hi);
    const visible = lo <= 0x7e && hi >= 0x21 ? Math.max(lo, 0x21) : lo;
    representatives.push(printable ?? visible);
  }
  return representatives;
}

// Well-formed UTF-16: 0 between scalar values, 1 after a high surrogate.
function wellFormedStep(state: number, unit: number): number | null {
  const high = unit >= 0xd800 && unit <= 0xdbff;
  const low = unit >= 0xdc00 && unit <= 0xdfff;
  if (state === 1) return low ? 0 : null;
  if (low) return null;
  return high ? 1 : 0;
}

/** What Kibi decided about two languages. */
// implements REQ-kibi-non-numeric-proof-kinds
export type LanguageDecision =
  | Readonly<{ holds: true }>
  | Readonly<{ holds: false; witness: string; reason: string }>;

type Relation = "equal" | "disjoint" | "subset";

function decide(
  left: LanguageSpec,
  right: LanguageSpec,
  relation: Relation,
): LanguageDecision {
  const a = new Determinizer(compileLanguage(left));
  const b = new Determinizer(compileLanguage(right));
  const alphabet = minterms([a, b]);
  type Node = { a: number; b: number; wf: number; text: number[] };
  const start: Node = { a: a.initial(), b: b.initial(), wf: 0, text: [] };
  const seen = new Set<string>([`${start.a},${start.b},0`]);
  const queue: Node[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head] as Node;
    if (node.wf === 0) {
      const inA = a.accepts(node.a);
      const inB = b.accepts(node.b);
      const witness = String.fromCharCode(...node.text);
      if (relation === "equal" && inA !== inB)
        return {
          holds: false,
          witness,
          reason: `${JSON.stringify(witness)} is in ${inA ? "the first" : "the second"} language only`,
        };
      if (relation === "disjoint" && inA && inB)
        return { holds: false, witness, reason: `${JSON.stringify(witness)} is in both languages` };
      if (relation === "subset" && inA && !inB)
        return {
          holds: false,
          witness,
          reason: `${JSON.stringify(witness)} is in the first language but not the second`,
        };
    }
    for (const unit of alphabet) {
      const wf = wellFormedStep(node.wf, unit);
      if (wf === null) continue;
      const next = { a: a.step(node.a, unit), b: b.step(node.b, unit), wf };
      const key = `${next.a},${next.b},${wf}`;
      if (seen.has(key)) continue;
      if (seen.size >= MAX_PRODUCT_STATES)
        throw new UnsupportedPattern("the languages' product automaton grew too large to decide");
      seen.add(key);
      queue.push({ ...next, text: [...node.text, unit] });
    }
  }
  return { holds: true };
}

/** Whether two languages hold exactly the same strings. */
// implements REQ-kibi-non-numeric-proof-kinds
export function languagesEqual(left: LanguageSpec, right: LanguageSpec): LanguageDecision {
  return decide(left, right, "equal");
}

/** Whether no string is in both languages. */
// implements REQ-kibi-non-numeric-proof-kinds
export function languagesDisjoint(left: LanguageSpec, right: LanguageSpec): LanguageDecision {
  return decide(left, right, "disjoint");
}

/** Whether every string of `left` is in `right`. */
// implements REQ-kibi-non-numeric-proof-kinds
export function languageIncluded(left: LanguageSpec, right: LanguageSpec): LanguageDecision {
  return decide(left, right, "subset");
}

/** Whether a language holds `text` (a well-formed string). */
// implements REQ-kibi-non-numeric-proof-kinds
export function languageAccepts(spec: LanguageSpec, text: string): boolean {
  const automaton = new Determinizer(compileLanguage(spec));
  let state = automaton.initial();
  for (let index = 0; index < text.length; index++)
    state = automaton.step(state, text.charCodeAt(index));
  return automaton.accepts(state);
}
