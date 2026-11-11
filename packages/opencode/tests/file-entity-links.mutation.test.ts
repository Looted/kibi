/// <reference types="bun-types" />
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getFileLinkedEntityIds,
  getFileLinkedTargetsByType,
  parseSymbolsYaml,
} from "../src/file-entity-links";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspace(symbols?: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-fel-mut-"));
  roots.push(root);
  if (symbols) {
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      symbols.join("\n"),
    );
  }
  return root;
}

function row(
  id: string,
  sourceFile: string,
  links: string[] = [],
  relationships: Array<{ type: string; target: string }> = [],
) {
  return { id, sourceFile, links, relationships };
}

describe("parseSymbolsYaml", () => {
  test("trims ids, source files, types and targets; tight and wide spacing", () => {
    expect(
      parseSymbolsYaml(
        [
          "  -   id:SYM-a  ",
          "    sourceFile:src/a.ts  ",
          "    relationships:",
          "      -   type:implements  ",
          "        target:REQ-a  ",
          "      - type: covered_by",
          "        target: REQ-b",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row(
        "SYM-a",
        "src/a.ts",
        [],
        [
          { type: "implements", target: "REQ-a" },
          { type: "covered_by", target: "REQ-b" },
        ],
      ),
    ]);
  });

  test("reads CRLF manifests", () => {
    expect(
      parseSymbolsYaml(
        [
          "symbols:",
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    links:",
          "      - REQ-l",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-a",
          "",
        ].join("\r\n"),
      ),
    ).toStrictEqual([
      row(
        "SYM-a",
        "src/a.ts",
        ["REQ-l"],
        [{ type: "implements", target: "REQ-a" }],
      ),
    ]);
  });

  test("keys must start their line after the indentation", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    note: x - id: SYM-fake",
          "    note: y sourceFile: src/fake.ts",
          "    note: z links:",
          "      - REQ-not-a-link",
          "    relationships:",
          "      note: v - type: fake",
          "        target: REQ-v",
          "      - type: implements",
          "        target: REQ-a",
          "        note: w target: REQ-fake",
          "    links:",
          "      note: t - REQ-fake",
          "      - REQ-l",
          "    note: u relationships:",
          "      - type: fake",
          "        target: REQ-u",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row(
        "SYM-a",
        "src/a.ts",
        ["REQ-l"],
        [{ type: "implements", target: "REQ-a" }],
      ),
    ]);
  });

  test("section headers allow only trailing whitespace", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    links: [REQ-inline]",
          "      - REQ-x",
          "    relationships: []",
          "      - type: implements",
          "        target: REQ-y",
          "  - id: SYM-b",
          "    sourceFile: src/b.ts",
          "    links:   ",
          "      - REQ-b",
          "    relationships:\t",
          "      - type: implements",
          "        target: REQ-c",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row("SYM-a", "src/a.ts"),
      row(
        "SYM-b",
        "src/b.ts",
        ["REQ-b"],
        [{ type: "implements", target: "REQ-c" }],
      ),
    ]);
  });

  test("link items are whole REQ ids, with any spacing", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    links:",
          "      -    REQ-wide  ",
          "      - REQ-x extra",
          "      - SCEN-x",
          "      -REQ-tight",
          "      - REQ-ok",
        ].join("\n"),
      ),
    ).toStrictEqual([row("SYM-a", "src/a.ts", ["REQ-wide", "REQ-ok"])]);
  });

  test("link items count only in a links section, relationships only in theirs", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "      - REQ-before",
          "      - type: before",
          "        target: REQ-before",
          "    relationships:",
          "      - REQ-in-rels",
          "      - type: implements",
          "        target: REQ-a",
          "    links:",
          "      - type: in-links",
          "        target: REQ-in-links",
          "      - REQ-l",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row(
        "SYM-a",
        "src/a.ts",
        ["REQ-l"],
        [{ type: "implements", target: "REQ-a" }],
      ),
    ]);
  });

  test("a sourceFile line ends the current section", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    links:",
          "      - REQ-a",
          "    sourceFile: src/a.ts",
          "      - REQ-after",
          "  - id: SYM-b",
          "    relationships:",
          "      - type: implements",
          "    sourceFile: src/b.ts",
          "        target: REQ-after",
          "      - type: covered_by",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row("SYM-a", "src/a.ts", ["REQ-a"]),
      row("SYM-b", "src/b.ts"),
    ]);
  });

  test("a new entry starts with no section", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    links:",
          "      - REQ-a",
          "  - id: SYM-b",
          "    sourceFile: src/b.ts",
          "      - REQ-b",
          "  - id: SYM-c",
          "    sourceFile: src/c.ts",
          "    relationships:",
          "      - type: implements",
          "  - id: SYM-d",
          "    sourceFile: src/d.ts",
          "      - type: implements",
          "        target: REQ-d",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row("SYM-a", "src/a.ts", ["REQ-a"]),
      row("SYM-b", "src/b.ts"),
      row("SYM-c", "src/c.ts"),
      row("SYM-d", "src/d.ts"),
    ]);
  });

  test("a relationships header forgets the unfinished relationship", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    relationships:",
          "      - type: implements",
          "    links:",
          "      - REQ-l",
          "    relationships:",
          "        target: REQ-orphan",
          "      - type: covered_by",
          "        target: REQ-c",
          "        target: REQ-last",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row(
        "SYM-a",
        "src/a.ts",
        ["REQ-l"],
        [{ type: "covered_by", target: "REQ-last" }],
      ),
    ]);
  });

  test("relationships need both a type and a target", () => {
    expect(
      parseSymbolsYaml(
        [
          "  - id: SYM-a",
          "    sourceFile: src/a.ts",
          "    relationships:",
          "      - type:   ",
          "        target: REQ-no-type",
          "      - type: no-target",
          "        target:  ",
          "      - type: no-target-line",
          "      - type: implements",
          "        target: REQ-a",
        ].join("\n"),
      ),
    ).toStrictEqual([
      row("SYM-a", "src/a.ts", [], [{ type: "implements", target: "REQ-a" }]),
    ]);
  });

  test("entries need a non-blank id and source file", () => {
    expect(
      parseSymbolsYaml(
        [
          "    sourceFile: src/orphan.ts",
          "  - id:   ",
          "    sourceFile: src/blank-id.ts",
          "  - id: SYM-no-source",
          "  - id: SYM-blank-source",
          "    sourceFile:   ",
          "  - id: SYM-ok",
          "    sourceFile: src/ok.ts",
        ].join("\n"),
      ),
    ).toStrictEqual([row("SYM-ok", "src/ok.ts")]);
  });
});

describe("getFileLinkedEntityIds", () => {
  const lanes = [
    ["requirements", "REQ"],
    ["scenarios", "SCEN"],
    ["tests", "TEST"],
    ["adr", "ADR"],
    ["flags", "FLAG"],
    ["events", "EVT"],
    ["facts", "FACT"],
  ] as const;

  test.each(lanes)("a %s document maps to its own id", (lane, prefix) => {
    const root = workspace();
    expect(
      getFileLinkedEntityIds(root, `.kb/${lane}/nested/${prefix}-x_1.md`),
    ).toStrictEqual({ ids: [`${prefix}-x_1`], source: "doc-path" });
  });

  test("doc names must be whole entity file names under a doc root", () => {
    const root = workspace([
      "  - id: SYM-a",
      "    sourceFile: .kb/requirements/xREQ-a.md",
      "    links:",
      "      - REQ-from-symbols",
    ]);
    expect(
      getFileLinkedEntityIds(root, ".kb/requirements/xREQ-a.md"),
    ).toStrictEqual({ ids: ["REQ-from-symbols"], source: "symbols" });
    for (const relPath of [
      ".kb/requirements/REQ-a.mdx",
      ".kb/requirements/REQ-a.md.bak",
      ".kb/requirementsX/REQ-a.md",
      ".kb/symbols.yaml/REQ-a.md",
      "docs/REQ-a.md",
      "REQ-a.md",
    ]) {
      expect(getFileLinkedEntityIds(root, relPath)).toStrictEqual({
        ids: [],
        source: "none",
      });
    }
  });

  test("absolute paths inside the worktree are matched relative to it", () => {
    const root = workspace([
      "  - id: SYM-a",
      "    sourceFile: src/a.ts",
      "    links:",
      "      - REQ-a",
    ]);
    expect(
      getFileLinkedEntityIds(root, path.join(root, "src", "a.ts")),
    ).toStrictEqual({ ids: ["REQ-a"], source: "symbols" });
    expect(
      getFileLinkedEntityIds(root, path.join(root, ".kb", "adr", "ADR-1.md")),
    ).toStrictEqual({ ids: ["ADR-1"], source: "doc-path" });
  });

  test("relationships by priority, then links, deduplicated and capped at three", () => {
    const root = workspace([
      "  - id: SYM-a",
      "    sourceFile: src/a.ts",
      "    links:",
      "      - REQ-link",
      "    relationships:",
      "      - type: executable_for",
      "        target: REQ-exec",
      "      - type: covered_by",
      "        target: REQ-cov",
      "      - type: other",
      "        target: REQ-other",
      "  - id: SYM-b",
      "    sourceFile: src/a.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-impl",
      "      - type: covered_by",
      "        target: REQ-impl",
    ]);
    expect(getFileLinkedEntityIds(root, "src/a.ts")).toStrictEqual({
      ids: ["REQ-impl", "REQ-cov", "REQ-exec"],
      source: "symbols",
    });
  });

  test("links fill up after relationships, without duplicates", () => {
    const root = workspace([
      "  - id: SYM-a",
      "    sourceFile: src/a.ts",
      "    links:",
      "      - REQ-impl",
      "      - REQ-l1",
      "      - REQ-l1",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-impl",
    ]);
    expect(getFileLinkedEntityIds(root, "src/a.ts")).toStrictEqual({
      ids: ["REQ-impl", "REQ-l1"],
      source: "symbols",
    });
  });

  test("a listed file without links reports symbols with no ids", () => {
    const root = workspace(["  - id: SYM-a", "    sourceFile: src/a.ts"]);
    expect(getFileLinkedEntityIds(root, "src/a.ts")).toStrictEqual({
      ids: [],
      source: "symbols",
    });
  });

  test("files missing from the manifest, or no manifest, report none", () => {
    const root = workspace(["  - id: SYM-a", "    sourceFile: src/a.ts"]);
    expect(getFileLinkedEntityIds(root, "src/b.ts")).toStrictEqual({
      ids: [],
      source: "none",
    });
    expect(getFileLinkedEntityIds(workspace(), "src/a.ts")).toStrictEqual({
      ids: [],
      source: "none",
    });
  });
});

describe("getFileLinkedTargetsByType", () => {
  test("collects targets of the given types across rows, once each", () => {
    const root = workspace([
      "  - id: SYM-a",
      "    sourceFile: src/a.ts",
      "    links:",
      "      - REQ-link",
      "    relationships:",
      "      - type: covered_by",
      "        target: TEST-1",
      "      - type: implements",
      "        target: REQ-1",
      "  - id: SYM-b",
      "    sourceFile: src/other.ts",
      "    relationships:",
      "      - type: covered_by",
      "        target: TEST-other",
      "  - id: SYM-c",
      "    sourceFile: src/a.ts",
      "    relationships:",
      "      - type: covered_by",
      "        target: TEST-1",
      "      - type: executable_for",
      "        target: TEST-2",
    ]);
    expect(
      getFileLinkedTargetsByType(root, path.join(root, "src/a.ts"), [
        "covered_by",
        "executable_for",
      ]),
    ).toStrictEqual(["TEST-1", "TEST-2"]);
    expect(
      getFileLinkedTargetsByType(root, "src/none.ts", ["implements"]),
    ).toStrictEqual([]);
  });

  test("no manifest gives no targets", () => {
    expect(
      getFileLinkedTargetsByType(workspace(), "src/a.ts", ["implements"]),
    ).toStrictEqual([]);
  });
});
