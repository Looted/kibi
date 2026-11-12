import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  EntitySummary,
  FactClaim,
  IndexedSymbol,
} from "../src/knowledge-index";
import {
  GROUNDING_LINK_TYPES,
  MAX_SNIPPET_CHARS,
  claimSnippetSlot,
  describeEntity,
  editFocus,
  editKnowledgeContext,
  factClaimSentence,
  fileKnowledgeSnippet,
  focusedSymbols,
  isRetiredStatus,
  requirementGroundingLines,
  unownedSourceNote,
  unreadableManifestNote,
} from "../src/snippets";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-snip-c-"));
  roots.push(dir);
  return dir;
}

function sym(
  id: string,
  line: number | undefined,
  endLine: number | undefined,
  extra: Partial<IndexedSymbol> = {},
): IndexedSymbol {
  return {
    id,
    title: id,
    ...(line === undefined ? {} : { line }),
    ...(endLine === undefined ? {} : { endLine }),
    implements: [],
    coveredBy: [],
    executableFor: [],
    ...extra,
  };
}

const ids = (symbols: readonly IndexedSymbol[]) => symbols.map((s) => s.id);
const plain = (id: string): EntitySummary => ({ id });

describe("focusedSymbols", () => {
  test("range edges overlap; lineless symbols never do", () => {
    const a = sym("a", 5, 9);
    expect(ids(focusedSymbols([a], [{ start: 1, end: 5 }]))).toEqual(["a"]);
    expect(ids(focusedSymbols([a], [{ start: 9, end: 12 }]))).toEqual(["a"]);
    expect(ids(focusedSymbols([a], [{ start: 1, end: 4 }]))).toEqual([]);
    expect(ids(focusedSymbols([a], [{ start: 10, end: 12 }]))).toEqual([]);
    expect(
      ids(focusedSymbols([sym("b", 5, undefined)], [{ start: 5, end: 5 }])),
    ).toEqual(["b"]);
    expect(
      ids(focusedSymbols([sym("c", undefined, 9)], [{ start: 1, end: 100 }])),
    ).toEqual([]);
    expect(focusedSymbols([a], undefined)).toEqual([]);
  });

  test("any range counts, and the narrowest span sorts first", () => {
    const wide = sym("wide", 1, 30);
    const narrow = sym("narrow", 50, 60);
    expect(
      ids(
        focusedSymbols(
          [wide, narrow],
          [
            { start: 1, end: 1 },
            { start: 55, end: 55 },
          ],
        ),
      ),
    ).toEqual(["narrow", "wide"]);
    expect(
      ids(
        focusedSymbols(
          [sym("one", 3, undefined), narrow],
          [{ start: 1, end: 99 }],
        ),
      ),
    ).toEqual(["one", "narrow"]);
  });
});

describe("editFocus", () => {
  const file = () => {
    const dir = tempDir();
    const target = path.join(dir, "a.ts");
    fs.writeFileSync(target, "first\nsecond\nthird\nfourth\n");
    return target;
  };

  test("finds needles, including at the start of the file", () => {
    const target = file();
    expect(editFocus(target, { old_string: "first" })).toStrictEqual([
      { start: 1, end: 1 },
    ]);
    expect(
      editFocus(target, {
        oldString: "third\nfourth",
        edits: [null, "x", { old_string: "second" }, { oldString: "nope" }],
      }),
    ).toStrictEqual([
      { start: 3, end: 4 },
      { start: 2, end: 2 },
    ]);
    expect(editFocus(target, { edits: "first" })).toBeUndefined();
  });

  test("empty, missing or unfound needles and unreadable files give nothing", () => {
    const target = file();
    for (const input of [
      undefined,
      null,
      "first",
      { old_string: "" },
      { old_string: 1 },
    ]) {
      expect(editFocus(target, input)).toBeUndefined();
    }
    expect(editFocus(target, { old_string: "nope" })).toBeUndefined();
    expect(
      editFocus(path.join(path.dirname(target), "missing.ts"), {
        old_string: "first",
      }),
    ).toBeUndefined();
  });

  test("files over 2 MiB are not scanned", () => {
    const dir = tempDir();
    const target = path.join(dir, "big.ts");
    const limit = 2 * 1024 * 1024;
    fs.writeFileSync(target, `x${" ".repeat(limit - 1)}`);
    expect(editFocus(target, { old_string: "x" })).toStrictEqual([
      { start: 1, end: 1 },
    ]);
    fs.writeFileSync(target, `x${" ".repeat(limit)}`);
    expect(editFocus(target, { old_string: "x" })).toBeUndefined();
  });
});

describe("describeEntity", () => {
  test("retired and firmness labels, titles cut at 80", () => {
    expect(isRetiredStatus(undefined)).toBe(false);
    expect(describeEntity({ id: "R", status: "Deprecated" })).toBe(
      "R (Deprecated)",
    );
    expect(describeEntity({ id: "R", firmness: "firm" })).toBe(
      "R [firm: ask before changing]",
    );
    expect(
      describeEntity({ id: "R", firmness: "exploratory", title: "T" }),
    ).toBe("R [exploratory]: T");
    expect(describeEntity({ id: "R", firmness: "default", title: "T" })).toBe(
      "R: T",
    );
    expect(describeEntity({ id: "R", title: "x".repeat(80) })).toBe(
      `R: ${"x".repeat(80)}`,
    );
    expect(describeEntity({ id: "R", title: "x".repeat(81) })).toBe(
      `R: ${"x".repeat(79)}…`,
    );
  });

  test("a title cut at a dot is completed from the statement", () => {
    const show = (title: string, statement: string) =>
      describeEntity({ id: "R", title, statement });
    expect(show("Never call console", "Never call console.log in prod")).toBe(
      "R: Never call console.log in prod",
    );
    expect(show("Never call console", "Never call console.log. Ever.")).toBe(
      "R: Never call console.log",
    );
    expect(show("Never call console", "Never call console.log!")).toBe(
      "R: Never call console.log",
    );
    expect(show("Never call console", "Never call console.log.x. Ever")).toBe(
      "R: Never call console.log.x",
    );
    expect(show("Never call console", "Never call console. Ever")).toBe(
      "R: Never call console",
    );
    expect(show("Never call console", "Never call console x.y")).toBe(
      "R: Never call console",
    );
    expect(show("Never call console", "Say: Never call console.log")).toBe(
      "R: Never call console",
    );
    expect(show("Use v", "Use v.2")).toBe("R: Use v.2");
    expect(show("Use v", "Use v.!")).toBe("R: Use v.");
  });
});

describe("unowned and unreadable notes", () => {
  const cand = (id: string, title: string) => ({ id, title });

  test("names candidates, with the first one's id to query", () => {
    expect(
      unownedSourceNote("src/a.ts", [
        cand("REQ-a", "A"),
        cand("REQ-b", "B"),
      ]).split("\n"),
    ).toEqual([
      "Kibi: no symbol in src/a.ts is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.",
      'Requirements whose titles share words with this path or the request: REQ-a: A; REQ-b: B. kb_query({id:"REQ-a"}) shows whether one describes the behavior being changed; one that does is traced by an implements link from the symbol that implements it (for markup, the component that renders it).',
      'kb_search({query:"<behavior being changed>", sourceLocations:[{path:"src/a.ts"}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_upsert (requirement + scenario + symbol implements link) as part of the change.',
    ]);
  });

  test("drops candidates to fit the budget, exactly at the limit", () => {
    const base = unownedSourceNote("p", [cand("R", "t")]).length;
    const room = MAX_SNIPPET_CHARS - base;
    // Each extra character of the path appears twice in the note.
    const pathText = `p${"x".repeat(Math.floor(room / 2))}`;
    const id = room % 2 === 1 ? "RR" : "R";
    const exact = unownedSourceNote(pathText, [cand(id, "t")]);
    expect(exact.length).toBe(MAX_SNIPPET_CHARS);
    expect(exact).toContain("Requirements whose titles");
    const over = unownedSourceNote(`${pathText}x`, [cand(id, "t")]);
    expect(over.split("\n")).toHaveLength(2);
    expect(over).not.toContain("Requirements whose titles");
  });

  test("with no candidate it says nothing recorded is known", () => {
    expect(unownedSourceNote("a.ts").split("\n")).toEqual([
      "Kibi: no symbol in a.ts is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.",
      "No requirement title matches this file, so nothing recorded is known to cover it.",
      'kb_search({query:"<behavior being changed>", sourceLocations:[{path:"a.ts"}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_upsert (requirement + scenario + symbol implements link) before the work is reported done.',
    ]);
  });

  test("unreadable manifest note", () => {
    expect(unreadableManifestNote("a.ts")).toBe(
      [
        "Kibi: the hook could not read .kb/symbols.yaml, so requirement snippets are unavailable this session.",
        'kb_query({sourceFile:"a.ts"}) still lists what a.ts implements; `kibi sync` rewrites the manifest in the canonical block layout.',
      ].join("\n"),
    );
  });
});

describe("factClaimSentence", () => {
  const sentence = (claim: FactClaim) => factClaimSentence({ id: "F", claim });
  const property = (extra: Partial<FactClaim>): FactClaim => ({
    factKind: "property_value",
    subjectKey: "app.greet",
    propertyKey: "calls",
    operator: "excludes",
    values: ["console.log"],
    ...extra,
  });

  test("verbs for set properties and their operators", () => {
    for (const [key, verb] of [
      ["calls", "call"],
      ["imports", "import"],
      ["reads", "read"],
      ["uses", "use"],
      ["throws", "throw"],
    ]) {
      expect(sentence(property({ propertyKey: key }))).toBe(
        `app greet must not ${verb} console.log`,
      );
    }
    const values = ["a", "b", "c"];
    expect(sentence(property({ operator: "includes", values }))).toBe(
      "app greet must call a, b and c",
    );
    expect(sentence(property({ operator: "subset_of", values }))).toBe(
      "app greet may call only a, b or c",
    );
    expect(sentence(property({ operator: "eq", values: ["a", "b"] }))).toBe(
      "app greet must call exactly a and b",
    );
  });

  test("operator phrases for other properties", () => {
    const phrases = {
      eq: "must be",
      neq: "must not be",
      lt: "must be less than",
      lte: "must be at most",
      gt: "must be greater than",
      gte: "must be at least",
      matches: "must match",
      includes: "must include",
      subset_of: "must be within",
      excludes: "must not include",
    };
    for (const [operator, phrase] of Object.entries(phrases)) {
      expect(
        sentence(
          property({ propertyKey: "max__size", operator, values: ["1", "2"] }),
        ),
      ).toBe(`app greet: max size ${phrase} 1, 2`);
    }
    expect(
      sentence(
        property({
          propertyKey: "timeout",
          operator: "lte",
          values: ["5"],
          unit: "s",
        }),
      ),
    ).toBe("app greet: timeout must be at most 5 s");
    expect(
      sentence(
        property({ propertyKey: "timeout", operator: "near", claimText: "C" }),
      ),
    ).toBe("C");
  });

  test("the subject comes from the claim text, else the subject key", () => {
    expect(
      sentence(property({ claimText: "The greet function  must never log" })),
    ).toBe("The greet function must not call console.log");
    expect(
      sentence(
        property({ claimText: `${"x".repeat(120)} must log`, subjectKey: "k" }),
      ),
    ).toBe("k must not call console.log");
    expect(sentence(property({ subjectKey: "a..b_c" }))).toBe(
      "a b c must not call console.log",
    );
    expect(sentence(property({ subjectKey: "_a_" }))).toBe(
      "a must not call console.log",
    );
    expect(sentence(property({ subjectKey: undefined }))).toBeUndefined();
    expect(sentence(property({ subjectKey: "__", claimText: "Plain" }))).toBe(
      "Plain",
    );
  });

  test("incomplete property claims and subject facts", () => {
    for (const missing of [
      { propertyKey: undefined },
      { operator: undefined },
      { values: [] },
      { values: undefined },
    ]) {
      expect(sentence(property({ ...missing, claimText: "T" }))).toBe("T");
    }
    expect(sentence({ factKind: "subject", claimText: "T" })).toBeUndefined();
    expect(factClaimSentence({ id: "F" })).toBeUndefined();
  });
});

describe("requirementGroundingLines", () => {
  test("every grounding link type, the more count and closing stops", () => {
    expect(GROUNDING_LINK_TYPES).toEqual([
      "constrains",
      "requires_property",
      "requires_predicate",
      "requires_rule",
    ]);
    const facts: Record<string, EntitySummary> = {
      R: {
        id: "R",
        links: GROUNDING_LINK_TYPES.map((type, index) => ({
          type,
          target: `F${index}`,
        })),
      },
    };
    GROUNDING_LINK_TYPES.forEach((_, index) => {
      facts[`F${index}`] = { id: `F${index}`, title: `Claim ${index}.. ` };
    });
    const summarize = (id: string) => facts[id] ?? plain(id);
    expect(requirementGroundingLines("R", summarize, { maxFacts: 4 })).toEqual([
      "R must keep true: Claim 0; Claim 1; Claim 2; Claim 3.",
    ]);
    expect(requirementGroundingLines("R", summarize)).toEqual([
      "R must keep true: Claim 0; Claim 1 +2 more.",
    ]);
  });

  test("no fact links means no statement line", () => {
    const summarize = (id: string): EntitySummary =>
      id === "R" ? { id, statement: "S", links: [] } : plain(id);
    expect(requirementGroundingLines("R", summarize)).toEqual([]);
  });
});

describe("fileKnowledgeSnippet", () => {
  const summarize = plain;

  test("owners rank by focus, then by symbol count, without duplicate titles", () => {
    const symbols = [
      sym("s5", 9, 10, { title: "five", implements: ["R-few"] }),
      sym("s1", 1, 2, { title: "one", implements: ["R-many"] }),
      sym("s2", 3, 4, { title: "two", implements: ["R-many"] }),
      sym("s3", 5, 6, { title: "two", implements: ["R-many"] }),
      sym("s4", 7, 8, { title: "four", implements: ["R-focus"] }),
      sym("s6", 11, 12, { title: "six", implements: ["R-few", "R-many"] }),
    ];
    const read = fileKnowledgeSnippet({
      relativePath: "a.ts",
      symbols,
      surface: "read",
      focus: [{ start: 7, end: 7 }],
      summarize,
    });
    expect(read?.split("\n").slice(0, 4)).toEqual([
      "Kibi knowledge for a.ts (symbol manifest):",
      "- R-focus — four",
      "- R-many — one, two, six",
      "- R-few — five, six",
    ]);
    expect(read).toContain(
      "These lines are inside four, which implements R-focus.",
    );
    expect(read).not.toContain("kb_check");
  });

  test("focus owners among themselves rank by symbol count", () => {
    const read = fileKnowledgeSnippet({
      relativePath: "a.ts",
      symbols: [
        sym("s1", 1, 9, { title: "one", implements: ["R-f1", "R-f2"] }),
        sym("s2", 20, 21, { title: "two", implements: ["R-f2"] }),
      ],
      surface: "read",
      focus: [{ start: 2, end: 2 }],
      summarize,
    });
    expect(read?.split("\n").slice(1, 3)).toEqual([
      "- R-f2 — one, two",
      "- R-f1 — one",
    ]);
  });

  test("more than four requirements and three tests are counted", () => {
    const symbols = [
      sym("s", 1, 2, {
        implements: ["R1", "R2", "R3", "R4", "R5", "R6"],
        coveredBy: ["T4", "T2", "T3", "T1"],
        executableFor: ["R9", "R8"],
      }),
    ];
    const lines = fileKnowledgeSnippet({
      relativePath: "a.ts",
      symbols,
      surface: "read",
      summarize,
    })?.split("\n");
    expect(lines).toEqual([
      "Kibi knowledge for a.ts (symbol manifest):",
      "- R1 — s",
      "- R2 — s",
      "- R3 — s",
      "- R4 — s",
      '- +2 more requirements: kb_query({sourceFile:"a.ts"})',
      "Covered by: T1, T2, T3 +1.",
      "Test code for: R8, R9.",
      'Next layer: kb_query({id:"R1", includeBody:true}) returns the full requirement text and why it exists; kb_search({query:"<topic>", sourceLocations:[{path:"a.ts"}]}) answers with governing requirements, facts, decisions, and tests.',
    ]);
    const four = fileKnowledgeSnippet({
      relativePath: "a.ts",
      symbols: [sym("s", 1, 2, { implements: ["R1", "R2", "R3", "R4"] })],
      surface: "read",
      summarize,
    });
    expect(four).not.toContain("more requirements");
  });

  test("a test-only file has no lead requirement; the edit names an unowned symbol", () => {
    const lines = fileKnowledgeSnippet({
      relativePath: "a.ts",
      symbols: [sym("helper", 1, 5, { executableFor: ["R1"] })],
      surface: "edit",
      focus: [{ start: 2, end: 2 }],
      summarize,
    })?.split("\n");
    expect(lines).toEqual([
      "Kibi knowledge for a.ts (symbol manifest):",
      "Test code for: R1.",
      "The edit is inside helper.",
      'Next layer: kb_search({query:"<topic>", sourceLocations:[{path:"a.ts", symbol:"helper"}]}) answers with governing requirements, facts, decisions, and tests.',
      'Behavior changes here are traced to these requirements; kb_check({sourceFiles:["a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.',
    ]);
    expect(
      fileKnowledgeSnippet({
        relativePath: "a.ts",
        symbols: [sym("helper", 1, 5, { coveredBy: ["T1"] })],
        surface: "read",
        summarize,
      }),
    ).toContain("Covered by: T1.");
  });
});

describe("snippet slots", () => {
  test("markers are empty files named by the key's hash", () => {
    const stateDir = tempDir();
    expect(claimSnippetSlot(stateDir, "k")).toBe(true);
    const name = createHash("sha256").update("k").digest("hex").slice(0, 32);
    expect(
      fs.readFileSync(path.join(stateDir, "shown-snippets", name), "utf8"),
    ).toBe("");
    expect(claimSnippetSlot(stateDir, "k")).toBe(false);
  });

  test("edit context gives a file without symbols only the note", () => {
    expect(
      editKnowledgeContext({
        relativePaths: ["a.ts"],
        symbolsFor: () => [],
        summarize: plain,
        stateDir: undefined,
        sessionId: undefined,
        noteFor: (relativePath) => `note ${relativePath}`,
      }),
    ).toBe("note a.ts");
  });
});
