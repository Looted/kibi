import { describe, expect, test } from "bun:test";
import type { SourceAnalysisResult } from "kibi-plugin-sdk";
import {
  baseAnalysisUsable,
  declarationLocator,
  declarationOwnText,
  declarationSpanKey,
  declarationsInChange,
  judgedByCommit,
  stripCommentsAndWhitespace,
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
    analysis: { symbols, ...extra } as unknown as SourceAnalysisResult,
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

describe("stripCommentsAndWhitespace", () => {
  test("drops comments and whitespace but keeps string literals", () => {
    expect(stripCommentsAndWhitespace("a = 1; // note\nb = /* x */ 2;")).toBe(
      "a=1;b=2;",
    );
    expect(stripCommentsAndWhitespace('u = "http://a" // c')).toBe(
      'u="http://a"',
    );
    expect(stripCommentsAndWhitespace("q = '/* no */' + `//${x}`")).toBe(
      "q='/*no*/'+`//${x}`",
    );
    expect(stripCommentsAndWhitespace('e = "a\\"b" // c')).toBe('e="a\\"b"');
    // A slash or a star alone starts no comment.
    expect(stripCommentsAndWhitespace("x = a*b / c")).toBe("x=a*b/c");
    // The block ends at the first */ after its opening /*.
    expect(stripCommentsAndWhitespace("/*/ x */y")).toBe("y");
    // Unterminated comments and strings run to the end.
    expect(stripCommentsAndWhitespace("a /* open")).toBe("a");
    expect(stripCommentsAndWhitespace("a // end")).toBe("a");
    expect(stripCommentsAndWhitespace('a "open')).toBe('a"open');
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
    expect(declarationOwnText(content, outer, [outer, inner])).toBe(
      "classC{x=2;}",
    );
    expect(declarationOwnText(content, inner, [outer, inner])).toBe(
      "m(){return1;}",
    );
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
    ).toBe("cde");
    expect(
      declarationOwnText(five, sym("s", 3, 5), [
        sym("s", 3, 5),
        sym("x", 4, 6),
      ]),
    ).toBe("cde");
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
