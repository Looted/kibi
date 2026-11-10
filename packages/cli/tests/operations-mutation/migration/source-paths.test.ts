import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  type AuthoredSourceRef,
  type PlannedSourcePathRepairs,
  type SourceRepair,
  applySourcePathRepairs,
  findDanglingSources,
  findSourceRepairs,
  isPathShapedTextRef,
  plannedSourcePathRepairs,
  resolveAuthoredSource,
  scanAuthoredSources,
  shownSourceValue,
  workspacePathExists,
} from "../../../src/operations/migration/source-paths.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  removeTempWorkspaces();
});

const doc = (frontmatter: string, body = "Body.\n") =>
  `---\n${frontmatter}---\n${body}`;
const FILES: Record<string, string> = {
  ".kb/requirements/REQ-1.md": doc(
    "id: REQ-1\ntitle: One\nsource: requirements/REQ-1.md\ntext_ref: requirements/REQ-2.md\n",
  ),
  ".kb/requirements/REQ-2.md": doc(
    "id: REQ-2\nsemantic_text: Two.\nsource: .kb/requirements/REQ-2.md\ntext_ref: docs/gone.md\n",
  ),
  ".kb/facts/FACT-1.md": doc(
    "id: FACT-1\nsource: documentation/facts/FACT-2.md#top\ntext_ref: ' facts/FACT-2.md '\n",
  ),
  ".kb/facts/FACT-2.md": doc(
    "id: FACT-2\nsource: https://example.com/x\ntext_ref: .kb/facts/FACT-2.md\n",
  ),
  ".kb/facts/FACT-3.md": doc(
    "id: FACT-3\nsource: nowhere\ntext_ref: facts/FACT-3.md\n",
  ),
  ".kb/facts/FACT-4.md": doc(
    "id: FACT-4\nsource: >\n  wrapped\ntext_ref: >\n  facts/FACT-2.md\n",
  ),
  ".kb/facts/FACT-5.md": doc(
    "id: FACT-5\nsource: SYM-1\ntext_ref: docs/a.md\n",
  ),
  ".kb/facts/FACT-6.md": doc(
    "id: FACT-6\nsemantic_source_field: text_ref\nsource: docs/a.md\ntext_ref: docs/missing.md\n",
  ),
  ".kb/facts/no-id.md": doc(
    "title: No id\nsource: '   '\ntext_ref: see the docs\n",
  ),
  ".kb/facts/numeric.md": doc("id: 42\nsource: null\ntext_ref: 7\n"),
  ".kb/facts/no-frontmatter.md": "Just text.\n",
  ".kb/scenarios/SCN-1.md": doc(
    "id: SCN-1\ntype: req\nsemantic_text: x\ntext_ref: docs/a.md\nsource: [a, b]\n",
  ),
  ".kb/scenarios/SCN-2.md": doc(
    "id: SCN-2\ntype: req\nsemantic_source_field: title\ntext_ref: docs/b.md\n",
  ),
  ".kb/scenarios/SCN-3.md": doc("id: SCN-3\ntype: req\ntext_ref: docs/c.md\n"),
  ".kb/symbols.yaml":
    "symbols:\n  - id: SYM-1\n    title: s\n  -   id :  'SYM-2'  \nid: \"\"\n    id: SYM-3\n  - id: a'b'\n  - id: 'a'b\n  - sid: NOTID\n",
  ".kb/requirements/REQ-3.md": doc(
    "id: REQ-3\ntext_ref: >\n  docs/missing.md\n",
  ),
  "docs/a.md": "A\n",
};

const SCAN_REFS = [
  {
    entityId: "REQ-1",
    field: "source",
    file: ".kb/requirements/REQ-1.md",
    value: "requirements/REQ-1.md",
  },
  {
    entityId: "REQ-1",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/requirements/REQ-1.md",
    value: "requirements/REQ-2.md",
  },
  {
    entityId: "REQ-2",
    field: "source",
    file: ".kb/requirements/REQ-2.md",
    value: ".kb/requirements/REQ-2.md",
  },
  {
    entityId: "REQ-2",
    field: "text_ref",
    file: ".kb/requirements/REQ-2.md",
    value: "docs/gone.md",
  },
  {
    entityId: "REQ-3",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/requirements/REQ-3.md",
    value: "docs/missing.md\n",
  },
  {
    entityId: "SCN-1",
    field: "source",
    file: ".kb/scenarios/SCN-1.md",
    value: ["a", "b"],
  },
  {
    entityId: "SCN-1",
    field: "text_ref",
    file: ".kb/scenarios/SCN-1.md",
    value: "docs/a.md",
  },
  {
    entityId: "SCN-2",
    field: "text_ref",
    file: ".kb/scenarios/SCN-2.md",
    value: "docs/b.md",
  },
  {
    entityId: "SCN-3",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/scenarios/SCN-3.md",
    value: "docs/c.md",
  },
  {
    entityId: "FACT-1",
    field: "source",
    file: ".kb/facts/FACT-1.md",
    value: "documentation/facts/FACT-2.md#top",
  },
  {
    entityId: "FACT-1",
    field: "text_ref",
    file: ".kb/facts/FACT-1.md",
    value: " facts/FACT-2.md ",
  },
  {
    entityId: "FACT-2",
    field: "source",
    file: ".kb/facts/FACT-2.md",
    value: "https://example.com/x",
  },
  {
    entityId: "FACT-2",
    field: "text_ref",
    file: ".kb/facts/FACT-2.md",
    value: ".kb/facts/FACT-2.md",
  },
  {
    entityId: "FACT-3",
    field: "source",
    file: ".kb/facts/FACT-3.md",
    value: "nowhere",
  },
  {
    entityId: "FACT-3",
    field: "text_ref",
    file: ".kb/facts/FACT-3.md",
    value: "facts/FACT-3.md",
  },
  {
    entityId: "FACT-4",
    field: "source",
    file: ".kb/facts/FACT-4.md",
    value: "wrapped\n",
  },
  {
    entityId: "FACT-4",
    field: "text_ref",
    file: ".kb/facts/FACT-4.md",
    value: "facts/FACT-2.md\n",
  },
  {
    entityId: "FACT-5",
    field: "source",
    file: ".kb/facts/FACT-5.md",
    value: "SYM-1",
  },
  {
    entityId: "FACT-5",
    field: "text_ref",
    file: ".kb/facts/FACT-5.md",
    value: "docs/a.md",
  },
  {
    entityId: "FACT-6",
    field: "source",
    file: ".kb/facts/FACT-6.md",
    value: "docs/a.md",
  },
  {
    entityId: "FACT-6",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/facts/FACT-6.md",
    value: "docs/missing.md",
  },
];

const SCAN_IDS = [
  "REQ-1",
  "REQ-2",
  "REQ-3",
  "SCN-1",
  "SCN-2",
  "SCN-3",
  "FACT-1",
  "FACT-2",
  "FACT-3",
  "FACT-4",
  "FACT-5",
  "FACT-6",
  "no-id",
  "42",
  "SYM-1",
  "SYM-2",
  "SYM-3",
  "a'b'",
  "'a'b",
];

const REPAIRS = [
  {
    entityId: "FACT-1",
    field: "source",
    file: ".kb/facts/FACT-1.md",
    value: "documentation/facts/FACT-2.md#top",
    dangling: true,
    fix: {
      kind: "rewrite",
      to: ".kb/facts/FACT-2.md#top",
    },
  },
  {
    entityId: "FACT-1",
    field: "text_ref",
    file: ".kb/facts/FACT-1.md",
    value: " facts/FACT-2.md ",
    dangling: true,
    fix: {
      kind: "rewrite",
      to: ".kb/facts/FACT-2.md",
    },
  },
  {
    entityId: "FACT-3",
    field: "source",
    file: ".kb/facts/FACT-3.md",
    value: "nowhere",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
  },
  {
    entityId: "FACT-3",
    field: "text_ref",
    file: ".kb/facts/FACT-3.md",
    value: "facts/FACT-3.md",
    dangling: true,
    fix: {
      kind: "rewrite",
      to: ".kb/facts/FACT-3.md",
    },
  },
  {
    entityId: "FACT-4",
    field: "source",
    file: ".kb/facts/FACT-4.md",
    value: "wrapped\n",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "the source field spans several lines, or editing it would change other frontmatter fields",
  },
  {
    entityId: "FACT-4",
    field: "text_ref",
    file: ".kb/facts/FACT-4.md",
    value: "facts/FACT-2.md\n",
    dangling: true,
    fix: {
      kind: "rewrite",
      to: ".kb/facts/FACT-2.md",
    },
    refused:
      "the text_ref field spans several lines, or editing it would change other frontmatter fields",
  },
  {
    entityId: "FACT-6",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/facts/FACT-6.md",
    value: "docs/missing.md",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    entityId: "REQ-1",
    field: "source",
    file: ".kb/requirements/REQ-1.md",
    value: "requirements/REQ-1.md",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "self",
    },
  },
  {
    entityId: "REQ-1",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/requirements/REQ-1.md",
    value: "requirements/REQ-2.md",
    dangling: true,
    fix: {
      kind: "rewrite",
      to: ".kb/requirements/REQ-2.md",
    },
    refused:
      "text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    entityId: "REQ-2",
    field: "source",
    file: ".kb/requirements/REQ-2.md",
    value: ".kb/requirements/REQ-2.md",
    dangling: false,
    fix: {
      kind: "remove",
      reason: "self",
    },
  },
  {
    entityId: "REQ-2",
    field: "text_ref",
    file: ".kb/requirements/REQ-2.md",
    value: "docs/gone.md",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
  },
  {
    entityId: "REQ-3",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/requirements/REQ-3.md",
    value: "docs/missing.md\n",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    entityId: "SCN-1",
    field: "source",
    file: ".kb/scenarios/SCN-1.md",
    value: ["a", "b"],
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
  },
  {
    entityId: "SCN-2",
    field: "text_ref",
    file: ".kb/scenarios/SCN-2.md",
    value: "docs/b.md",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
  },
  {
    entityId: "SCN-3",
    field: "text_ref",
    semanticSource: true,
    file: ".kb/scenarios/SCN-3.md",
    value: "docs/c.md",
    dangling: true,
    fix: {
      kind: "remove",
      reason: "dangling",
    },
    refused:
      "text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
];

const PLANNED = {
  rewrites: [
    {
      entityId: "FACT-1",
      file: ".kb/facts/FACT-1.md",
      from: "documentation/facts/FACT-2.md#top",
      to: ".kb/facts/FACT-2.md#top",
    },
    {
      entityId: "FACT-1",
      file: ".kb/facts/FACT-1.md",
      field: "text_ref",
      from: " facts/FACT-2.md ",
      to: ".kb/facts/FACT-2.md",
    },
    {
      entityId: "FACT-3",
      file: ".kb/facts/FACT-3.md",
      field: "text_ref",
      from: "facts/FACT-3.md",
      to: ".kb/facts/FACT-3.md",
    },
  ],
  removals: [
    {
      entityId: "FACT-3",
      file: ".kb/facts/FACT-3.md",
      from: "nowhere",
      reason: "dangling",
    },
    {
      entityId: "REQ-1",
      file: ".kb/requirements/REQ-1.md",
      from: "requirements/REQ-1.md",
      reason: "self",
    },
    {
      entityId: "REQ-2",
      file: ".kb/requirements/REQ-2.md",
      from: ".kb/requirements/REQ-2.md",
      reason: "self",
    },
    {
      entityId: "SCN-1",
      file: ".kb/scenarios/SCN-1.md",
      from: '["a","b"]',
      reason: "dangling",
    },
  ],
};

const APPLIED = {
  rewritten: [
    {
      entityId: "FACT-1",
      file: ".kb/facts/FACT-1.md",
      from: "documentation/facts/FACT-2.md#top",
      to: ".kb/facts/FACT-2.md#top",
    },
    {
      entityId: "FACT-1",
      file: ".kb/facts/FACT-1.md",
      field: "text_ref",
      from: " facts/FACT-2.md ",
      to: ".kb/facts/FACT-2.md",
    },
    {
      entityId: "FACT-3",
      file: ".kb/facts/FACT-3.md",
      field: "text_ref",
      from: "facts/FACT-3.md",
      to: ".kb/facts/FACT-3.md",
    },
  ],
  removed: [
    {
      entityId: "FACT-3",
      file: ".kb/facts/FACT-3.md",
      from: "nowhere",
      reason: "dangling",
    },
    {
      entityId: "REQ-1",
      file: ".kb/requirements/REQ-1.md",
      from: "requirements/REQ-1.md",
      reason: "self",
    },
    {
      entityId: "REQ-2",
      file: ".kb/requirements/REQ-2.md",
      from: ".kb/requirements/REQ-2.md",
      reason: "self",
    },
    {
      entityId: "SCN-1",
      file: ".kb/scenarios/SCN-1.md",
      from: '["a","b"]',
      reason: "dangling",
    },
  ],
  skipped: [
    {
      file: ".kb/facts/FACT-4.md",
      reason:
        "the source field spans several lines, or editing it would change other frontmatter fields",
    },
    {
      file: ".kb/facts/FACT-4.md",
      reason:
        "the text_ref field spans several lines, or editing it would change other frontmatter fields",
    },
    {
      file: ".kb/facts/FACT-6.md",
      reason:
        "text_ref 'docs/missing.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
    },
    {
      file: ".kb/requirements/REQ-1.md",
      reason:
        "text_ref 'requirements/REQ-2.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
    },
    {
      file: ".kb/requirements/REQ-2.md",
      reason:
        "text_ref 'docs/gone.md': no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
    },
    {
      file: ".kb/requirements/REQ-3.md",
      reason:
        "text_ref 'docs/missing.md\n': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
    },
    {
      file: ".kb/scenarios/SCN-2.md",
      reason:
        "text_ref 'docs/b.md': no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
    },
    {
      file: ".kb/scenarios/SCN-3.md",
      reason:
        "text_ref 'docs/c.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
    },
  ],
};

const CHANGED = {
  ".kb/requirements/REQ-1.md":
    "---\nid: REQ-1\ntitle: One\ntext_ref: requirements/REQ-2.md\n---\nBody.\n",
  ".kb/requirements/REQ-2.md":
    "---\nid: REQ-2\nsemantic_text: Two.\ntext_ref: docs/gone.md\n---\nBody.\n",
  ".kb/facts/FACT-1.md":
    "---\nid: FACT-1\nsource: .kb/facts/FACT-2.md#top\ntext_ref: '.kb/facts/FACT-2.md'\n---\nBody.\n",
  ".kb/facts/FACT-3.md":
    "---\nid: FACT-3\ntext_ref: .kb/facts/FACT-3.md\n---\nBody.\n",
  ".kb/scenarios/SCN-1.md":
    "---\nid: SCN-1\ntype: req\nsemantic_text: x\ntext_ref: docs/a.md\n---\nBody.\n",
};

const SKIPPED_AGAIN = [
  {
    file: ".kb/facts/FACT-4.md",
    reason:
      "the source field spans several lines, or editing it would change other frontmatter fields",
  },
  {
    file: ".kb/facts/FACT-4.md",
    reason:
      "the text_ref field spans several lines, or editing it would change other frontmatter fields",
  },
  {
    file: ".kb/facts/FACT-6.md",
    reason:
      "text_ref 'docs/missing.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    file: ".kb/requirements/REQ-1.md",
    reason:
      "text_ref 'requirements/REQ-2.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    file: ".kb/requirements/REQ-2.md",
    reason:
      "text_ref 'docs/gone.md': no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
  },
  {
    file: ".kb/requirements/REQ-3.md",
    reason:
      "text_ref 'docs/missing.md\n': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
  {
    file: ".kb/scenarios/SCN-2.md",
    reason:
      "text_ref 'docs/b.md': no file under .kb/ matches it, so Kibi cannot tell what evidence it meant",
  },
  {
    file: ".kb/scenarios/SCN-3.md",
    reason:
      "text_ref 'docs/c.md': text_ref is this requirement's semantic source, so changing it changes its semantic inventory hash; re-derive the inventory after editing it",
  },
];

const read = (root: string, file: string) =>
  readFileSync(path.join(root, file), "utf8");

describe("isPathShapedTextRef", () => {
  test.each([
    ["docs/a.md", true],
    ["  docs/a.md  ", true],
    ["./docs/a.md", true],
    [".kb/facts/F.md#top", true],
    ["a/b/c.tar.GZ9", true],
    ["docs/a.md#", true],
    ["docs/a", false],
    ["a.md", false],
    ["docs/.md", false],
    ["docs/a.", false],
    ["docs/a.m-d", false],
    ["docs/a b.md", false],
    ["docs/a.md other", false],
    ["docs/a.md#x y", false],
    ["docs;x/a.md", false],
    ["docs,x/a.md", false],
    ["docs/a,b.md", false],
    ["c:/a/b.md", false],
    ["https://example.com/a.md", false],
    ["../docs/a.md", true],
    ["docs/sub/", false],
    ["docs/a.md\nx", false],
    ["x\ndocs/a.md", false],
    [7, false],
    [null, false],
    [["docs/a.md"], false],
  ] as const)("%j is a path: %j", (value, expected) => {
    expect(isPathShapedTextRef(value)).toBe(expected);
  });
});

describe("shownSourceValue", () => {
  test("text as it is, anything else as JSON", () => {
    expect(shownSourceValue(" a ")).toBe(" a ");
    expect(shownSourceValue(["a", 1])).toBe('["a",1]');
    expect(shownSourceValue(7)).toBe("7");
    expect(shownSourceValue(null)).toBe("null");
    expect(shownSourceValue(undefined)).toBe("");
  });
});

describe("resolveAuthoredSource", () => {
  const EXISTING = new Set([
    "docs/a.md",
    ".kb/requirements/REQ-1.md",
    ".kb/requirements/REQ-2.md",
    ".kb/symbols.yaml",
    ".kb/facts/F.md",
    "#notes.md",
    "xdocs/a.md",
  ]);
  const context = {
    workspaceRoot: "/repo",
    entityIds: new Set(["REQ-1", "42"]),
    exists: (relative: string) => relative === "" || EXISTING.has(relative),
    file: ".kb/requirements/REQ-1.md",
  };
  test.each([
    [undefined, { kind: "missing" }],
    [null, { kind: "missing" }],
    ["", { kind: "missing" }],
    ["   ", { kind: "missing" }],
    [true, { kind: "dangling" }],
    [{ a: 1 }, { kind: "dangling" }],
    [42, { kind: "entity" }],
    [43, { kind: "dangling" }],
    [" REQ-1 ", { kind: "entity" }],
    ["https://example.com/x", { kind: "url" }],
    ["HTTP://EXAMPLE.COM", { kind: "url" }],
    ["http://", { kind: "dangling" }],
    ["ftp://example.com", { kind: "dangling" }],
    ["see https://example.com", { kind: "dangling" }],
    ["https://example.com/a b", { kind: "dangling" }],
    ["docs/a.md", { kind: "path" }],
    ["./docs/a.md", { kind: "path" }],
    ["docs\\a.md", { kind: "path" }],
    ["docs/a.md#section", { kind: "path" }],
    ["docs/a.md   #section", { kind: "path" }],
    [".//docs/a.md", { kind: "dangling" }],
    ["x./docs/a.md", { kind: "dangling" }],
    ["#section", { kind: "dangling" }],
    ["#notes.md", { kind: "dangling" }],
    [".kb/requirements/REQ-1.md", { kind: "self", resolves: true }],
    ["./.kb/requirements/REQ-1.md#top", { kind: "self", resolves: true }],
    [".KB/Requirements/req-1.md", { kind: "self", resolves: false }],
    ["documentation/requirements/REQ-1.md", { kind: "self", resolves: false }],
    ["Documentation/Requirements/REQ-1.md", { kind: "self", resolves: false }],
    ["requirements/REQ-1.md", { kind: "self", resolves: false }],
    [
      "requirements/REQ-2.md#a",
      { kind: "dangling", rewrite: ".kb/requirements/REQ-2.md#a" },
    ],
    [
      "documentation/requirements/REQ-2.md",
      { kind: "dangling", rewrite: ".kb/requirements/REQ-2.md" },
    ],
    [
      "./documentation/requirements/REQ-2.md",
      { kind: "dangling", rewrite: ".kb/requirements/REQ-2.md" },
    ],
    ["symbols.yaml", { kind: "dangling", rewrite: ".kb/symbols.yaml" }],
    [
      "documentation/facts/F.md",
      { kind: "dangling", rewrite: ".kb/facts/F.md" },
    ],
    ["Documentation/requirements/REQ-2.md", { kind: "dangling" }],
    ["xdocumentation/requirements/REQ-2.md", { kind: "dangling" }],
    ["Requirements/REQ-2.md", { kind: "dangling" }],
    ["notalane/REQ-2.md", { kind: "dangling" }],
    ["requirements/REQ-404.md", { kind: "dangling" }],
    ["documentation/REQ-1.md", { kind: "dangling" }],
  ] as const)("%j resolves to %j", (value, expected) => {
    expect(resolveAuthoredSource(value, context)).toStrictEqual(expected);
  });

  test("without the entity's own file nothing is self", () => {
    const { file: _file, ...anonymous } = context;
    expect(
      resolveAuthoredSource(".kb/requirements/REQ-1.md", anonymous),
    ).toStrictEqual({ kind: "path" });
    expect(
      resolveAuthoredSource("requirements/REQ-1.md", anonymous),
    ).toStrictEqual({ kind: "dangling", rewrite: ".kb/requirements/REQ-1.md" });
    expect(resolveAuthoredSource("nowhere", anonymous)).toStrictEqual({
      kind: "dangling",
    });
  });

  test("another existing file is provenance, even when it maps onto the entity's own file", () => {
    expect(
      resolveAuthoredSource("requirements/REQ-1.md", {
        ...context,
        exists: (relative) => relative === "requirements/REQ-1.md",
      }),
    ).toStrictEqual({ kind: "path" });
  });
});

describe("workspacePathExists", () => {
  test("is confined to the workspace and remembers each answer", () => {
    const root = tempWorkspace({ "docs/a.md": "A\n", "..x.md": "X\n" });
    const exists = workspacePathExists(`${root}/docs/..`);
    expect(exists("docs/a.md")).toBe(true);
    expect(exists("docs/b.md")).toBe(false);
    expect(exists("..x.md")).toBe(true);
    expect(exists(".")).toBe(true);
    expect(exists("")).toBe(true);
    expect(exists("docs/../docs/a.md")).toBe(true);
    expect(exists("..")).toBe(false);
    expect(exists(`../${path.basename(root)}/docs/a.md`)).toBe(true);
    expect(exists(path.join(root, "docs/a.md"))).toBe(true);
    expect(exists("/etc/hostname")).toBe(false);
    expect(exists(`${root}x`)).toBe(false);
    rmSync(path.join(root, "docs/a.md"));
    writeFileSync(path.join(root, "docs/b.md"), "B\n");
    expect(exists("docs/a.md")).toBe(true);
    expect(exists("docs/b.md")).toBe(false);
  });
});

describe("authored sources in a workspace", () => {
  test("scanning reads every source and path-shaped text_ref, and every id", () => {
    const root = tempWorkspace(FILES);
    expect(scanAuthoredSources(root)).toStrictEqual({
      refs: SCAN_REFS as unknown as AuthoredSourceRef[],
      entityIds: new Set(SCAN_IDS),
    });
  });

  test("a workspace with no knowledge files has nothing to scan", () => {
    expect(scanAuthoredSources(tempWorkspace())).toStrictEqual({
      refs: [],
      entityIds: new Set(),
    });
  });

  test("a file that cannot be read is skipped", () => {
    const root = tempWorkspace({
      ".kb/facts/A.md": "---\nid: A\nsource: nowhere\n---\n",
      ".kb/facts/B.md": "---\nid: B\nsource: nowhere\n---\n",
    });
    const real = kbSources.readText;
    spies.push(
      spyOn(kbSources, "readText").mockImplementation((file) =>
        file.endsWith("A.md") ? null : real(file),
      ),
    );
    expect(
      scanAuthoredSources(root).refs.map((ref) => ref.entityId),
    ).toStrictEqual(["B"]);
  });

  test("repairs are sorted by entity, file and field, with why an edit is refused", () => {
    const root = tempWorkspace(FILES);
    const repairs = REPAIRS as unknown as SourceRepair[];
    expect(findSourceRepairs(root)).toStrictEqual(repairs);
    expect(findDanglingSources(root)).toStrictEqual(
      repairs.filter((repair) => repair.dangling),
    );
  });

  test("repairs of one entity in two files are ordered by file", () => {
    const root = tempWorkspace({
      ".kb/facts/b.md": "---\nid: SAME\nsource: nowhere\n---\n",
      ".kb/facts/a.md":
        "---\nid: SAME\ntext_ref: docs/gone.md\nsource: nowhere\n---\n",
    });
    expect(
      findSourceRepairs(root).map((repair) => `${repair.file} ${repair.field}`),
    ).toStrictEqual([
      ".kb/facts/a.md source",
      ".kb/facts/a.md text_ref",
      ".kb/facts/b.md source",
    ]);
  });

  test("an entity file that cannot be read back is refused", () => {
    const root = tempWorkspace({
      ".kb/facts/A.md": "---\nid: A\nsource: nowhere\n---\n",
    });
    const real = kbSources.readText;
    let reads = 0;
    spies.push(
      spyOn(kbSources, "readText").mockImplementation((file) => {
        if (file.endsWith("A.md")) reads += 1;
        return file.endsWith("A.md") && reads > 1 ? null : real(file);
      }),
    );
    expect(findSourceRepairs(root)[0]?.refused).toBe(
      "the entity file cannot be read",
    );
    reads = 0;
    expect(applySourcePathRepairs(root)).toStrictEqual({
      rewritten: [],
      removed: [],
      skipped: [
        {
          file: ".kb/facts/A.md",
          reason:
            "the source field spans several lines, or editing it would change other frontmatter fields",
        },
      ],
    });
  });

  test("the plan lists the repairs Kibi can make", () => {
    const root = tempWorkspace(FILES);
    expect(plannedSourcePathRepairs(findSourceRepairs(root))).toStrictEqual(
      PLANNED as unknown as PlannedSourcePathRepairs,
    );
    expect(plannedSourcePathRepairs([])).toStrictEqual({
      rewrites: [],
      removals: [],
    });
  });

  test("applying edits only the repaired lines, and a second run finds nothing", () => {
    const root = tempWorkspace(FILES);
    expect(applySourcePathRepairs(root)).toStrictEqual(
      APPLIED as unknown as ReturnType<typeof applySourcePathRepairs>,
    );
    const changed: Record<string, string> = CHANGED;
    for (const [file, content] of Object.entries(FILES))
      expect(read(root, file)).toBe(changed[file] ?? content);
    expect(applySourcePathRepairs(root)).toStrictEqual({
      rewritten: [],
      removed: [],
      skipped: SKIPPED_AGAIN,
    });
  });

  test("with a plan, only planned repairs that still read as planned are applied", () => {
    const root = tempWorkspace(FILES);
    const plan = plannedSourcePathRepairs(findSourceRepairs(root));
    const [fact1Source, fact1TextRef, fact3TextRef] = plan.rewrites;
    const [fact3Source, req1Source, req2Source, scnSource] = plan.removals;
    const result = applySourcePathRepairs(root, {
      rewrites: [
        fact1Source,
        { ...fact1TextRef, to: ".kb/facts/OTHER.md" },
        { ...fact3TextRef, entityId: "FACT-X" },
      ] as PlannedSourcePathRepairs["rewrites"],
      removals: [
        { ...fact3Source, from: "elsewhere" },
        { ...req1Source, reason: "dangling" },
        req2Source,
        { ...scnSource, field: "text_ref" },
      ] as PlannedSourcePathRepairs["removals"],
    });
    expect(result).toStrictEqual({
      rewritten: [fact1Source],
      removed: [req2Source],
      skipped: [
        {
          file: ".kb/facts/FACT-1.md",
          reason: "source changed since planning",
        },
        {
          file: ".kb/facts/FACT-3.md",
          reason: "source changed since planning",
        },
        {
          file: ".kb/facts/FACT-3.md",
          reason: "source changed since planning",
        },
        {
          file: ".kb/requirements/REQ-1.md",
          reason: "source changed since planning",
        },
      ],
    } as unknown as ReturnType<typeof applySourcePathRepairs>);
    expect(read(root, ".kb/facts/FACT-1.md")).toBe(
      "---\nid: FACT-1\nsource: .kb/facts/FACT-2.md#top\ntext_ref: ' facts/FACT-2.md '\n---\nBody.\n",
    );
    expect(read(root, ".kb/scenarios/SCN-1.md")).toBe(
      FILES[".kb/scenarios/SCN-1.md"] as string,
    );
  });

  test("a planned rewrite and removal of one value are told apart", () => {
    const root = tempWorkspace({
      ".kb/facts/A.md": "---\nid: A\nsource: nowhere\n---\n",
    });
    const planned = {
      entityId: "A",
      file: ".kb/facts/A.md",
      from: "nowhere",
    };
    expect(
      applySourcePathRepairs(root, {
        rewrites: [{ ...planned, to: "x" }],
        removals: [],
      }).skipped,
    ).toStrictEqual([
      { file: ".kb/facts/A.md", reason: "source changed since planning" },
    ]);
    expect(
      applySourcePathRepairs(root, { rewrites: [], removals: [] }),
    ).toStrictEqual({ rewritten: [], removed: [], skipped: [] });
    expect(
      applySourcePathRepairs(root, {
        rewrites: [],
        removals: [{ ...planned, reason: "dangling" }],
      }),
    ).toStrictEqual({
      rewritten: [],
      removed: [{ ...planned, reason: "dangling" }],
      skipped: [],
    });
    expect(read(root, ".kb/facts/A.md")).toBe("---\nid: A\n---\n");
  });

  test("a planned repair whose file can no longer be edited is skipped", () => {
    const root = tempWorkspace({
      ".kb/facts/A.md": "---\nid: A\ntext_ref: facts/B.md\n---\n",
      ".kb/facts/B.md": "---\nid: B\n---\n",
    });
    const plan = plannedSourcePathRepairs(findSourceRepairs(root));
    const real = kbSources.readText;
    let reads = 0;
    spies.push(
      spyOn(kbSources, "readText").mockImplementation((file) => {
        if (file.endsWith("A.md")) reads += 1;
        return file.endsWith("A.md") && reads > 1 ? null : real(file);
      }),
    );
    expect(applySourcePathRepairs(root, plan)).toStrictEqual({
      rewritten: [],
      removed: [],
      skipped: [
        {
          file: ".kb/facts/A.md",
          reason:
            "the text_ref field spans several lines, or editing it would change other frontmatter fields",
        },
      ],
    });
  });
});
