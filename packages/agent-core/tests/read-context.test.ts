import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { EntitySummary, IndexedSymbol } from "../src/knowledge-index";
import {
  MAX_EVENT_CHARS,
  MAX_SEARCH_REQUIREMENTS,
  MAX_SESSION_CHARS,
  MAX_SESSION_ROWS,
  type ReadView,
  globFilter,
  grepRegExp,
  hookReadRows,
  matchingLines,
  readContext,
  resolveReadViews,
  searchToolRead,
} from "../src/read-context";
import { claimSnippetSlot } from "../src/snippets";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(prefix = "kibi-read-context-"): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const SUMMARIES: Record<string, EntitySummary> = {
  "REQ-cap": {
    id: "REQ-cap",
    title: "A user owns at most 10 organizations",
    status: "open",
    firmness: "firm",
  },
  "REQ-name": { id: "REQ-name", title: "Names are trimmed", status: "open" },
  "REQ-old": { id: "REQ-old", title: "Old rule", status: "superseded" },
  "REQ-replaced": {
    id: "REQ-replaced",
    title: "Replaced rule",
    status: "closed",
    supersededBy: "REQ-cap",
  },
};

const summarize = (id: string): EntitySummary =>
  SUMMARIES[id] ?? { id, title: `Rule ${id}`, status: "open" };

function symbol(
  title: string,
  line: number,
  endLine: number,
  implementsIds: string[],
): IndexedSymbol {
  return {
    id: `SYM-${title}`,
    title,
    line,
    endLine,
    implements: implementsIds,
    coveredBy: [],
    executableFor: [],
  };
}

const ORGS: IndexedSymbol[] = [
  symbol("createOrganization", 1, 20, ["REQ-cap", "REQ-name"]),
  symbol("checkCap", 5, 9, ["REQ-cap"]),
  symbol("renameOrganization", 30, 40, ["REQ-name", "REQ-old"]),
];

const HEADER = "Kibi requirements for the code in view:";
const HINT =
  'kb_query({id:"<id>", includeBody:true}) gives a requirement\'s full text and why it exists.';

function rows(
  views: ReadView[],
  options: {
    stateDir?: string | undefined;
    sessionKey?: string;
    alreadyShown?: ReadonlySet<string>;
  } = {},
) {
  return readContext({
    views,
    summarize,
    stateDir: options.stateDir,
    sessionKey: options.sessionKey ?? "s",
    alreadyShown: options.alreadyShown,
  });
}

describe("rows for the code in view", () => {
  test("a read range names the innermost symbol's requirements, firm first", () => {
    expect(
      rows([
        {
          relativePath: "src/orgs.ts",
          symbols: ORGS,
          focus: [{ start: 6, end: 7 }],
        },
      ]),
    ).toEqual({
      text: [
        HEADER,
        "- REQ-cap [firm: ask before changing]: A user owns at most 10 organizations — checkCap",
        "- REQ-name: Names are trimmed — createOrganization",
        HINT,
      ].join("\n"),
      ids: ["REQ-cap", "REQ-name"],
      paths: ["src/orgs.ts"],
    });
  });

  test("retired requirements and lines outside every symbol name nothing", () => {
    const views = (start: number, end: number): ReadView[] => [
      { relativePath: "src/orgs.ts", symbols: ORGS, focus: [{ start, end }] },
    ];
    expect(rows(views(50, 60))).toBeUndefined();
    const retired = [symbol("old", 1, 5, ["REQ-old", "REQ-replaced"])];
    expect(
      rows([{ relativePath: "src/old.ts", symbols: retired }]),
    ).toBeUndefined();
  });

  test("a whole file with few requirements lists them, most symbols first", () => {
    const text = rows([{ relativePath: "src/orgs.ts", symbols: ORGS }])?.text;
    expect(text?.split("\n").slice(1, 3)).toEqual([
      "- REQ-cap [firm: ask before changing]: A user owns at most 10 organizations — createOrganization",
      "- REQ-name: Names are trimmed — createOrganization",
    ]);
  });

  test("a busy file read whole names its ids on one line", () => {
    const ids = ["REQ-a", "REQ-b", "REQ-c", "REQ-d", "REQ-e", "REQ-f"];
    const busy = ids.map((id, index) =>
      symbol(`fn${index}`, index * 10 + 1, index * 10 + 5, [id]),
    );
    const context = rows([{ relativePath: "src/busy.ts", symbols: busy }]);
    expect(context?.text.split("\n")[1]).toBe(
      "- src/busy.ts implements 6 requirements: REQ-a, REQ-b, REQ-c, REQ-d, REQ-e, REQ-f; reading a line range narrows them to the code in view.",
    );
    expect(context?.ids).toEqual([]);
    expect(context?.paths).toEqual(["src/busy.ts"]);
  });

  test("a busy file's id line is cut to its budget", () => {
    const busy = Array.from({ length: 60 }, (_, index) =>
      symbol(`fn${index}`, index * 10 + 1, index * 10 + 5, [
        `REQ-long-requirement-identifier-${index}`,
      ]),
    );
    const line = rows([
      { relativePath: "src/busy.ts", symbols: busy },
    ])?.text.split("\n")[1];
    expect(line?.length).toBe(600);
    expect(line?.endsWith("…")).toBe(true);
  });

  test("rows from several files name each file", () => {
    const other = [symbol("load", 1, 3, ["REQ-load"])];
    const text = rows([
      {
        relativePath: "src/orgs.ts",
        symbols: ORGS,
        focus: [{ start: 6, end: 6 }],
      },
      { relativePath: "src/load.ts", symbols: other },
    ])?.text;
    expect(text).toContain("— checkCap (src/orgs.ts)");
    expect(text).toContain("- REQ-load: Rule REQ-load — load (src/load.ts)");
  });

  test("at most three rows per event when lines are in view", () => {
    const many = [symbol("all", 1, 9, ["REQ-1", "REQ-2", "REQ-3", "REQ-4"])];
    expect(
      rows([
        {
          relativePath: "src/a.ts",
          symbols: many,
          focus: [{ start: 2, end: 2 }],
        },
      ])?.ids,
    ).toEqual(["REQ-1", "REQ-2", "REQ-3"]);
  });

  test("an event over its character budget drops the rows, then the hint, that do not fit", () => {
    const deep = (name: string) => `src/${"nested/".repeat(40)}${name}.ts`;
    const context = rows([
      {
        relativePath: deep("a"),
        symbols: [symbol("a", 1, 9, ["REQ-1"])],
        focus: [{ start: 2, end: 2 }],
      },
      {
        relativePath: deep("b"),
        symbols: [symbol("b", 1, 9, ["REQ-2"])],
        focus: [{ start: 2, end: 2 }],
      },
      {
        relativePath: deep("c"),
        symbols: [symbol("c", 1, 9, ["REQ-3"])],
        focus: [{ start: 2, end: 2 }],
      },
    ]);
    expect(context?.ids).toEqual(["REQ-1", "REQ-2"]);
    expect(context?.text).not.toContain("kb_query");
    expect(context?.text.length).toBeLessThanOrEqual(MAX_EVENT_CHARS);
  });

  test("requirements a Kibi result already showed are skipped, except a firm one in view", () => {
    const view: ReadView = {
      relativePath: "src/orgs.ts",
      symbols: ORGS,
      focus: [{ start: 6, end: 6 }],
    };
    expect(
      rows([view], { alreadyShown: new Set(["REQ-cap", "REQ-name"]) })?.ids,
    ).toEqual(["REQ-cap"]);
    expect(
      rows([{ relativePath: "src/orgs.ts", symbols: ORGS }], {
        alreadyShown: new Set(["REQ-cap", "REQ-name"]),
      }),
    ).toBeUndefined();
  });
});

describe("searches", () => {
  test("a search names the requirements of the symbols with the most matches", () => {
    const context = rows([
      { relativePath: "src/orgs.ts", symbols: ORGS, matches: [31, 32, 33, 6] },
    ]);
    expect(context?.ids).toEqual(["REQ-name", "REQ-cap"]);
    expect(context?.text).toContain(
      "- REQ-name: Names are trimmed — renameOrganization",
    );
  });

  test("a search across files is ranked as a whole, each requirement once", () => {
    const other = [symbol("load", 1, 9, ["REQ-name", "REQ-load"])];
    const context = rows([
      { relativePath: "src/orgs.ts", symbols: ORGS, matches: [6] },
      { relativePath: "src/load.ts", symbols: other, matches: [1, 2, 3] },
    ]);
    expect(context?.ids).toEqual(["REQ-load", "REQ-name", "REQ-cap"]);
  });

  test("a search that qualifies too many requirements stays silent", () => {
    const ids = Array.from(
      { length: MAX_SEARCH_REQUIREMENTS + 1 },
      (_, index) => `REQ-${index}`,
    );
    const wide = [symbol("all", 1, 9, ids)];
    expect(
      rows([{ relativePath: "src/a.ts", symbols: wide, matches: [2] }]),
    ).toBeUndefined();
  });

  test("matches outside every linked symbol name nothing", () => {
    expect(
      rows([{ relativePath: "src/orgs.ts", symbols: ORGS, matches: [50] }]),
    ).toBeUndefined();
  });
});

describe("session memory and budget", () => {
  const view = (start: number): ReadView => ({
    relativePath: "src/orgs.ts",
    symbols: ORGS,
    focus: [{ start, end: start }],
  });

  test("each requirement and the hint are shown once per session key", () => {
    const stateDir = tempDir();
    const first = rows([view(6)], { stateDir });
    expect(first?.text).toContain(HINT);
    expect(rows([view(6)], { stateDir })).toBeUndefined();
    expect(rows([view(35)], { stateDir })).toBeUndefined();
    // After a context reset the host passes a new key.
    const again = rows([view(6)], { stateDir, sessionKey: "s#1" });
    expect(again?.ids).toEqual(["REQ-cap", "REQ-name"]);
    // A new requirement in a later event comes without the hint.
    const later = rows(
      [{ relativePath: "src/x.ts", symbols: [symbol("x", 1, 2, ["REQ-x"])] }],
      { stateDir },
    );
    expect(later?.text).toBe(`${HEADER}\n- REQ-x: Rule REQ-x — x`);
  });

  test("a busy file's line is shown once per session", () => {
    const stateDir = tempDir();
    const busy = Array.from({ length: 6 }, (_, index) =>
      symbol(`fn${index}`, index * 10 + 1, index * 10 + 5, [`REQ-${index}`]),
    );
    const read: ReadView = { relativePath: "src/busy.ts", symbols: busy };
    expect(rows([read], { stateDir })).toBeDefined();
    expect(rows([read], { stateDir })).toBeUndefined();
  });

  test("the session row budget stops rows", () => {
    const stateDir = tempDir();
    let shown = 0;
    for (let index = 0; index < MAX_SESSION_ROWS + 3; index++) {
      const context = rows(
        [
          {
            relativePath: `src/f${index}.ts`,
            symbols: [symbol("f", 1, 2, [`REQ-f${index}`])],
          },
        ],
        { stateDir },
      );
      shown += context?.ids.length ?? 0;
    }
    expect(shown).toBe(MAX_SESSION_ROWS);
  });

  test("the session row budget also stops a busy line", () => {
    const stateDir = tempDir();
    const ledger = path.join(stateDir, "read-rows");
    fs.mkdirSync(ledger, { recursive: true });
    const busy = Array.from({ length: 6 }, (_, index) =>
      symbol(`fn${index}`, index * 10 + 1, index * 10 + 5, [`REQ-${index}`]),
    );
    // Nine rows spent: one small row fits, the busy line after it does not.
    for (let index = 0; index < 9; index++)
      rows(
        [
          {
            relativePath: `src/f${index}.ts`,
            symbols: [symbol("f", 1, 2, [`REQ-f${index}`])],
          },
        ],
        { stateDir },
      );
    const context = rows(
      [
        {
          relativePath: "src/last.ts",
          symbols: [symbol("f", 1, 2, ["REQ-last"])],
        },
        { relativePath: "src/busy.ts", symbols: busy },
      ],
      { stateDir },
    );
    expect(context?.ids).toEqual(["REQ-last"]);
    expect(context?.text).not.toContain("src/busy.ts implements");
  });

  function spend(stateDir: string, key: string, chars: number): void {
    const file = path.join(
      stateDir,
      "read-rows",
      `${createHash("sha256").update(key).digest("hex").slice(0, 32)}.jsonl`,
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(
      file,
      `${JSON.stringify({ rows: 0, chars })}\nnot json\n`,
    );
  }

  test("the session character budget stops rows and busy lines", () => {
    const stateDir = tempDir();
    const key = "spent";
    spend(stateDir, key, MAX_SESSION_CHARS - 150);
    const busy = Array.from({ length: 6 }, (_, index) =>
      symbol(`fn${index}`, index * 10 + 1, index * 10 + 5, [`REQ-${index}`]),
    );
    expect(
      rows(
        [
          {
            relativePath: "src/x.ts",
            symbols: [symbol("x", 1, 2, ["REQ-x"])],
            focus: [{ start: 1, end: 1 }],
          },
          { relativePath: "src/busy.ts", symbols: busy },
        ],
        { stateDir, sessionKey: key },
      ),
    ).toEqual({
      text: `${HEADER}\n- REQ-x: Rule REQ-x — x (src/x.ts)`,
      ids: ["REQ-x"],
      paths: ["src/x.ts"],
    });
    spend(stateDir, key, 1000);
    expect(rows([view(35)], { stateDir, sessionKey: key })).toBeUndefined();
  });

  test("an event whose rows exceed the session character budget drops them", () => {
    const stateDir = tempDir();
    spend(stateDir, "k", MAX_SESSION_CHARS - 60);
    expect(
      rows(
        [{ relativePath: "src/x.ts", symbols: [symbol("x", 1, 2, ["REQ-x"])] }],
        { stateDir, sessionKey: "k" },
      ),
    ).toBeUndefined();
  });

  test("an unwritable state directory stays quiet rather than repeat rows", () => {
    const parent = tempDir();
    const stateDir = path.join(parent, "file");
    fs.writeFileSync(stateDir, "");
    expect(rows([view(6)], { stateDir })).toBeUndefined();
  });

  test("an unwritable budget ledger only loses the session budget", () => {
    const stateDir = tempDir();
    fs.writeFileSync(path.join(stateDir, "read-rows"), "");
    expect(rows([view(6)], { stateDir })?.ids).toEqual(["REQ-cap", "REQ-name"]);
  });
});

describe("grep patterns", () => {
  const grep = (
    pattern: string,
    flags: Partial<Parameters<typeof grepRegExp>[0]> = {},
  ) =>
    grepRegExp({
      pattern,
      ignoreCase: false,
      fixed: false,
      basic: false,
      word: false,
      ...flags,
    });

  test("extended, basic, fixed, word and case-insensitive patterns", () => {
    expect(grep("a|b").test("b")).toBe(true);
    expect(grep("cap\\|limit", { basic: true }).test("limit")).toBe(true);
    expect(grep("f(x)", { basic: true }).test("f(x)")).toBe(true);
    expect(grep("a\\.b", { basic: true }).test("a.b")).toBe(true);
    expect(grep("a\\.b", { basic: true }).test("axb")).toBe(false);
    expect(grep("a.b", { fixed: true }).test("axb")).toBe(false);
    expect(grep("cap", { word: true }).test("capital")).toBe(false);
    expect(grep("CAP", { ignoreCase: true }).test("cap")).toBe(true);
    expect(grep("x\\", { basic: true }).test("x\\")).toBe(true);
  });

  test("a pattern JavaScript cannot read matches as literal text", () => {
    expect(grep("(?<x").test("a (?<x b")).toBe(true);
  });

  test("matching lines of a file, none for a missing or oversized file", () => {
    const root = tempDir();
    write(root, "a.ts", "one\ncap here\nthree\ncap again\n");
    write(root, "big.ts", `cap\n${"x".repeat(1024 * 1024)}`);
    const cap = {
      pattern: "cap",
      ignoreCase: false,
      fixed: false,
      basic: false,
      word: false,
    };
    expect(matchingLines(path.join(root, "a.ts"), cap)).toEqual([2, 4]);
    expect(matchingLines(path.join(root, "missing.ts"), cap)).toEqual([]);
    expect(matchingLines(path.join(root, "big.ts"), cap)).toEqual([]);
  });
});

describe("resolving shell reads to views", () => {
  const files: Record<string, IndexedSymbol[]> = {
    "src/orgs.ts": ORGS,
    "src/tests.ts": [
      {
        id: "SYM-t",
        title: "t",
        implements: [],
        coveredBy: ["TEST-x"],
        executableFor: [],
      },
    ],
    "lib/other.ts": [symbol("other", 1, 3, ["REQ-other"])],
    ".kb/notes.md": [symbol("notes", 1, 3, ["REQ-cap"])],
  };

  function workspace(): string {
    const root = tempDir();
    write(
      root,
      "src/orgs.ts",
      `${Array.from({ length: 40 }, (_, index) => (index === 5 ? "  cap check" : `line ${index + 1}`)).join("\n")}\n`,
    );
    write(root, "src/tests.ts", "cap\n");
    write(root, "lib/other.ts", "cap\n");
    write(root, ".kb/notes.md", "cap\n");
    write(root, "src/plain.ts", "cap\n");
    return root;
  }

  const cap = {
    pattern: "cap",
    ignoreCase: false,
    fixed: false,
    basic: false,
    word: false,
  };

  test("a recursive search covers the linked source files under its directory", () => {
    const root = workspace();
    const views = resolveReadViews(
      [{ absolute: path.join(root, "src"), directory: true, grep: cap }],
      {
        workspaceRoot: root,
        files,
        isSource: (file) => !file.startsWith(".kb/"),
      },
    );
    expect(views).toEqual([
      { relativePath: "src/orgs.ts", symbols: ORGS, matches: [6] },
    ]);
    const everywhere = resolveReadViews(
      [{ absolute: root, directory: true, grep: cap }],
      {
        workspaceRoot: root,
        files,
        isSource: (file) => !file.startsWith(".kb/"),
        admits: globFilter("src/**"),
      },
    );
    expect(everywhere.map((view) => view.relativePath)).toEqual([
      "src/orgs.ts",
    ]);
  });

  test("a search of one file with no match, or an unlinked file, gives no view", () => {
    const root = workspace();
    const options = {
      workspaceRoot: root,
      files,
      isSource: () => true,
    };
    expect(
      resolveReadViews(
        [
          {
            absolute: path.join(root, "src/orgs.ts"),
            directory: false,
            grep: { ...cap, pattern: "absent" },
          },
          {
            absolute: path.join(root, "src/plain.ts"),
            directory: false,
            grep: cap,
          },
        ],
        options,
      ),
    ).toEqual([]);
  });

  test("ranged and whole reads keep the first view of each linked source file", () => {
    const root = workspace();
    const views = resolveReadViews(
      [
        {
          absolute: path.join(root, "src/orgs.ts"),
          directory: false,
          focus: [{ start: 1, end: 5 }],
        },
        { absolute: path.join(root, "src/orgs.ts"), directory: false },
        { absolute: path.join(root, "lib/other.ts"), directory: false },
        { absolute: path.join(root, "src/tests.ts"), directory: false },
        { absolute: path.join(root, ".kb/notes.md"), directory: false },
        { absolute: path.join(root, "src"), directory: true },
        { absolute: path.join(os.tmpdir(), "elsewhere.ts"), directory: false },
      ],
      {
        workspaceRoot: root,
        files,
        isSource: (file) => !file.startsWith(".kb/"),
      },
    );
    expect(views).toEqual([
      {
        relativePath: "src/orgs.ts",
        symbols: ORGS,
        focus: [{ start: 1, end: 5 }],
      },
      { relativePath: "lib/other.ts", symbols: files["lib/other.ts"] },
    ]);
  });
});

describe("glob filters", () => {
  test("stars, globstars, choices and literal characters", () => {
    expect(globFilter("*.ts")("src/a/b.ts")).toBe(true);
    expect(globFilter("*.ts")("src/a/b.js")).toBe(false);
    expect(globFilter("src/*.ts")("src/a/b.ts")).toBe(false);
    expect(globFilter("src/**/*.ts")("src/a/b.ts")).toBe(true);
    expect(globFilter("src/**")("src/a/b.ts")).toBe(true);
    expect(globFilter("*.{ts,tsx}")("a.tsx")).toBe(true);
    expect(globFilter("?.ts")("a.ts")).toBe(true);
    expect(globFilter("a,b}.ts")("a,b}.ts")).toBe(true);
    expect(globFilter("a+b.ts")("a+b.ts")).toBe(true);
  });
});

describe("host hook rows", () => {
  function project() {
    const root = tempDir();
    write(
      root,
      "src/orgs.ts",
      `${Array.from({ length: 40 }, (_, index) => (index === 5 ? "  cap check" : `line ${index + 1}`)).join("\n")}\n`,
    );
    return root;
  }
  const files = { "src/orgs.ts": ORGS };

  test("rows for shell reads, with a file Kibi listed counted as shown", () => {
    const root = project();
    const input = {
      workspaceRoot: root,
      files,
      isSource: () => true,
      summarize,
      stateDir: undefined,
      sessionKey: "s",
    };
    const read = {
      absolute: path.join(root, "src/orgs.ts"),
      directory: false,
    };
    expect(hookReadRows([read], input)?.ids).toEqual(["REQ-cap", "REQ-name"]);
    expect(
      hookReadRows([read], { ...input, shownPaths: new Set(["src/orgs.ts"]) }),
    ).toBeUndefined();
    expect(
      hookReadRows([read], { ...input, shownIds: ["REQ-cap"] })?.ids,
    ).toEqual(["REQ-name"]);
    expect(
      hookReadRows([{ ...read, absolute: path.join(root, "x.ts") }], input),
    ).toBeUndefined();
  });

  test("a search tool call as a read of a file or directory", () => {
    const root = project();
    expect(searchToolRead({ pattern: "cap", path: "src", cwd: root })).toEqual({
      absolute: path.join(root, "src"),
      directory: true,
      grep: {
        pattern: "cap",
        ignoreCase: false,
        fixed: false,
        basic: false,
        word: false,
      },
    });
    expect(
      searchToolRead({
        pattern: "a.b",
        path: path.join(root, "src/orgs.ts"),
        cwd: "/",
        ignoreCase: true,
        fixed: true,
      }),
    ).toMatchObject({
      directory: false,
      grep: { ignoreCase: true, fixed: true },
    });
    expect(
      searchToolRead({ pattern: "cap", path: " ", cwd: root }),
    ).toMatchObject({ absolute: root, directory: true });
    expect(searchToolRead({ pattern: "", cwd: root })).toBeUndefined();
    expect(searchToolRead({ pattern: 3, cwd: root })).toBeUndefined();
    expect(
      searchToolRead({ pattern: "cap", path: "missing", cwd: root }),
    ).toBeUndefined();
  });
});

describe("host hook rows after an edit snippet", () => {
  test("a file whose shared edit snippet was shown counts as shown", () => {
    const root = tempDir();
    write(root, "src/orgs.ts", "x\n");
    const stateDir = tempDir();
    claimSnippetSlot(stateDir, "s\u0000edit\u0000src/orgs.ts");
    expect(
      hookReadRows(
        [{ absolute: path.join(root, "src/orgs.ts"), directory: false }],
        {
          workspaceRoot: root,
          files: { "src/orgs.ts": ORGS },
          isSource: () => true,
          summarize,
          stateDir,
          sessionKey: "s",
        },
      ),
    ).toBeUndefined();
  });
});

describe("ReDoS and time-budget safety", () => {
  test("catastrophic-backtracking patterns fall back to literal matching and return immediately", () => {
    const root = tempDir();
    const evilLine = `${"a".repeat(120)}!\n`;
    write(root, "src/long.ts", `${evilLine}${"x".repeat(1200)}\nmatch_me\n`);
    const file = path.join(root, "src/long.ts");
    const started = Date.now();
    for (const pattern of [
      "(\\w+\\s?)+$",
      "(a+)+$",
      "(a|aa)+$",
      "(a)\\1+",
      "a".repeat(600),
    ]) {
      const re = grepRegExp({
        pattern,
        ignoreCase: false,
        fixed: false,
        basic: false,
        word: false,
      });
      expect(re).toBeInstanceOf(RegExp);
      expect(
        matchingLines(file, {
          pattern,
          ignoreCase: false,
          fixed: false,
          basic: false,
          word: false,
        }),
      ).toEqual([]);
    }
    expect(Date.now() - started).toBeLessThan(200);
    // An expired deadline exits immediately without scanning.
    expect(
      matchingLines(
        file,
        {
          pattern: "match_me",
          ignoreCase: false,
          fixed: false,
          basic: false,
          word: false,
        },
        0,
      ),
    ).toEqual([]);
    // Overlong lines (> 1000 chars) are skipped while normal lines match.
    expect(
      matchingLines(file, {
        pattern: "match_me",
        ignoreCase: false,
        fixed: false,
        basic: false,
        word: false,
      }),
    ).toEqual([3]);
  });
});
