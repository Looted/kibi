import { describe, expect, test } from "bun:test";
import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import {
  baseAnalysisUsable,
  declarationLocator,
  declarationOwnText,
  declarationSpanKey,
  declarationsInChange,
  judgedByCommit,
  normalizeDeclarationText,
} from "../../src/traceability/staged-declaration-change.js";

type Sym = SourceAnalysisResult["symbols"][number];

function sym(
  name: string,
  startLine: number,
  endLine: number,
  extra: object = {},
): Sym {
  return {
    name,
    kind: "function",
    startLine,
    startColumn: 0,
    endLine,
    endColumn: 1,
    ...extra,
  } as Sym;
}

function source(content: string, symbols: Sym[], extra: object = {}) {
  return {
    analysis: {
      language: "typescript",
      symbols,
      ...extra,
    } as unknown as SourceAnalysisResult,
    content,
  };
}

function names(set: Set<Sym>): string[] {
  return [...set].map((symbol) => symbol.name).sort();
}

describe("declarationLocator and declarationSpanKey", () => {
  test("prefer the qualified name and key spans by their lines", () => {
    expect(declarationLocator(sym("m", 1, 2, { qualifiedName: "C.m" }))).toBe(
      "C.m",
    );
    expect(declarationLocator(sym("m", 1, 2))).toBe("m");
    expect(declarationSpanKey({ startLine: 3, endLine: 9 })).toBe("3:9");
  });
});

describe("baseAnalysisUsable", () => {
  test("accepts ok and legacy results and rejects failed or unusable partial ones", () => {
    expect(baseAnalysisUsable(source("", []).analysis)).toBe(true);
    expect(baseAnalysisUsable(source("", [], { status: "ok" }).analysis)).toBe(
      true,
    );
    expect(
      baseAnalysisUsable(source("", [], { status: "failed" }).analysis),
    ).toBe(false);
    expect(
      baseAnalysisUsable(
        source("", [], {
          status: "partial",
          diagnostics: [{ code: "OUTPUT_LIMIT" }],
        }).analysis,
      ),
    ).toBe(false);
  });
});

describe("normalizeDeclarationText", () => {
  const ts = (text: string) => normalizeDeclarationText(text, "typescript");

  test("drops comments and layout but keeps literals verbatim", () => {
    expect(ts("a = 1; // note\nb = /* x */ 2;")).toBe("a=1;b=2;");
    expect(ts('u = "http://a" // c')).toBe('u="http://a"');
    expect(ts("q = '/* no */' + `//${x}`")).toBe("q='/* no */'+`//${x}`");
    expect(ts('e = "a\\"b" // c')).toBe('e="a\\"b"');
    // Whitespace inside a string is part of it.
    expect(ts('j = xs.join(", ")')).not.toBe(ts('j = xs.join(",")'));
    // A slash or a star alone starts no comment.
    expect(ts("x = a*b / c")).toBe("x=a*b/c");
    // The block ends at the first */ after its opening /*.
    expect(ts("/*/ x */y")).toBe("y");
    // Unterminated comments and strings run to the end.
    expect(ts("a /* open")).toBe("a");
    expect(ts("a // end")).toBe("a");
    expect(ts('a "open')).toBe('a"open');
  });

  test("keeps one space where two tokens would join", () => {
    expect(ts("return  x ;")).toBe("return x;");
    expect(ts("a + +b")).toBe("a+ +b");
    expect(ts("a - -b")).toBe("a- -b");
    expect(ts("a + -b")).toBe("a+-b");
    expect(ts("a/* c */b")).toBe("a b");
    expect(ts("  lead")).toBe("lead");
  });

  test("a regex literal is kept, so a // inside it is no comment", () => {
    const before = 'return u.replace(/^https?:\\/\\//, "").slice(0, 10);';
    expect(ts(before)).toBe(
      'return u.replace(/^https?:\\/\\//,"").slice(0,10);',
    );
    expect(ts(before)).not.toBe(ts(before.replace("slice(0", "slice(1")));
    expect(ts("x = /[/]/g.test(y)")).toBe("x=/[/]/g.test(y)");
    expect(ts("return /a b/i")).toBe("return/a b/i");
    expect(ts("typeof /a/")).toBe("typeof/a/");
    expect(ts("/^a/.test(s)")).toBe("/^a/.test(s)");
    // After a value, a slash divides.
    expect(ts("a / b / c")).toBe("a/b/c");
    expect(ts("f(x) / 2")).toBe("f(x)/2");
    expect(ts("returned / 2 / 3")).toBe("returned/2/3");
    // A "regex" the line ends before closing is a division.
    expect(ts("x = (a\n/ b)")).toBe("x=(a/b)");
    expect(ts("x = (/ b")).toBe("x=(/b");
    expect(ts("x = [/ b\n]")).toBe("x=[/b]");
    // JavaScript only: other C-style languages have no regex literal.
    expect(normalizeDeclarationText("x = (/ a /)", "go")).toBe("x=(/a/)");
    expect(normalizeDeclarationText("x = (/ a /)", "javascript")).toBe(
      "x=(/ a /)",
    );
  });

  test("other languages only lose blank lines and trailing whitespace", () => {
    const python = "def f(a):  \n\n    return a // 2  # half\n";
    expect(normalizeDeclarationText(python, "python")).toBe(
      "def f(a):\n    return a // 2  # half",
    );
    expect(normalizeDeclarationText(python, undefined)).toBe(
      normalizeDeclarationText(python, "python"),
    );
    expect(normalizeDeclarationText("x = 1 // a\r\n", "c")).toBe("x=1");
  });
});

describe("declarationOwnText", () => {
  test("drops blank and comment lines, whitespace and nested declarations", () => {
    const content = [
      "class C {", // 1
      "  // note", // 2
      "  m() {", // 3
      "    return 1;", // 4
      "  }", // 5
      "", // 6
      "  /* block", // 7
      "   * more */", // 8
      "  x = 2;", // 9
      "}", // 10
    ].join("\n");
    const outer = sym("C", 1, 10);
    const inner = sym("m", 3, 5);
    expect(
      declarationOwnText(content, outer, [outer, inner], "typescript"),
    ).toBe("class C{x=2;}");
    expect(
      declarationOwnText(content, inner, [outer, inner], "typescript"),
    ).toBe("m(){return 1;}");
    // A span past the end of the file reads as empty lines.
    expect(declarationOwnText("a", sym("a", 1, 3), [])).toBe("a");
    // Only a declaration wholly inside the span is nested in it.
    const three = ["a", "b", "c"].join("\n");
    expect(
      declarationOwnText(three, sym("o", 1, 3), [
        sym("o", 1, 3),
        sym("i", 1, 2),
      ]),
    ).toBe("c");
    expect(
      declarationOwnText(three, sym("o", 1, 3), [
        sym("o", 1, 3),
        sym("i", 2, 3),
      ]),
    ).toBe("a");
    const five = ["a", "b", "c", "d", "e", "f"].join("\n");
    expect(
      declarationOwnText(five, sym("s", 3, 5), [
        sym("s", 3, 5),
        sym("x", 1, 4),
      ]),
    ).toBe("c\nd\ne");
    expect(
      declarationOwnText(five, sym("s", 3, 5), [
        sym("s", 3, 5),
        sym("x", 4, 6),
      ]),
    ).toBe("c\nd\ne");
    // A twin with the same span is not nested inside it.
    const twin = sym("t", 1, 1);
    expect(declarationOwnText("a=1", sym("a", 1, 1), [twin])).toBe("a=1");
  });
});

describe("declarationsInChange", () => {
  const base = source(
    [
      "export const tagIdSchema = z.string();", // 1
      "export function createTag() {", // 2
      "  return 1;", // 3
      "}", // 4
    ].join("\n"),
    [sym("tagIdSchema", 1, 1), sym("createTag", 2, 4)],
  );

  test("a missing or unusable base puts every declaration in the change", () => {
    const after = source("x", [sym("a", 1, 1), sym("b", 1, 1)]);
    expect(names(declarationsInChange(null, after))).toEqual(["a", "b"]);
    expect(
      names(declarationsInChange(source("x", [], { status: "failed" }), after)),
    ).toEqual(["a", "b"]);
  });

  test("only declarations whose own text changed or that are new", () => {
    const after = source(
      [
        "// moved below a comment and reformatted",
        "export const   tagIdSchema = z.string() ;",
        "export function createTag() {",
        "  return 2;",
        "}",
        "export function deleteTag() {}",
      ].join("\n"),
      [
        sym("tagIdSchema", 2, 2),
        sym("createTag", 3, 5),
        sym("deleteTag", 6, 6),
      ],
    );
    expect(names(declarationsInChange(base, after))).toEqual([
      "createTag",
      "deleteTag",
    ]);
  });

  test("a comment-only edit changes nothing", () => {
    const after = source(
      [
        "export const tagIdSchema = z.string(); ",
        "export function createTag() {",
        "  // why",
        "  return 1;",
        "}",
      ].join("\n"),
      [sym("tagIdSchema", 1, 1), sym("createTag", 2, 5)],
    );
    expect(names(declarationsInChange(base, after))).toEqual([]);
  });

  test("an edit inside a method changes the method, not its class", () => {
    const before = source(
      ["class C {", "  m() { return 1; }", "}"].join("\n"),
      [sym("C", 1, 3), sym("m", 2, 2, { qualifiedName: "C.m" })],
    );
    const after = source(["class C {", "  m() { return 2; }", "}"].join("\n"), [
      sym("C", 1, 3),
      sym("m", 2, 2, { qualifiedName: "C.m" }),
    ]);
    expect(names(declarationsInChange(before, after))).toEqual(["m"]);
  });

  test("duplicate locators match any base declaration with the same text", () => {
    const before = source(["f(a)", "f(b)"].join("\n"), [
      sym("f", 1, 1),
      sym("f", 2, 2),
    ]);
    const after = source(["f(b)", "f(c)"].join("\n"), [
      sym("f", 1, 1, { id: 1 }),
      sym("f", 2, 2, { id: 2 }),
    ]);
    const changed = [...declarationsInChange(before, after)];
    expect(changed.map((symbol) => symbol.startLine)).toEqual([2]);
  });
});

describe("judgedByCommit", () => {
  const symbol = { location: { startLine: 4, endLine: 8 } };

  test("recorded declarations and unknown changes are always judged", () => {
    expect(judgedByCommit(symbol, true, new Set())).toBe(true);
    expect(judgedByCommit(symbol, false, null)).toBe(true);
  });

  test("an unrecorded declaration is judged only when the commit changed it", () => {
    expect(judgedByCommit(symbol, false, new Set(["4:8"]))).toBe(true);
    expect(judgedByCommit(symbol, false, new Set(["4:9"]))).toBe(false);
  });
});
