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

import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ManifestError,
  type ManifestSymbolRecord,
  OUTSIDE_WORKSPACE_SCOPE_HASH,
  extractFromManifest,
  extractFromManifestString,
  extractManifestSymbolRecords,
  extractManifestSymbolRecordsString,
  readManifestWithCoordinateOverlay,
  resolveBoundSymbolScope,
} from "../../src/extractors/manifest.js";
import {
  coordinateIdentityHash,
  coordinateSourceHash,
  writeCoordinateArtifact,
  writeLegacyCoordinateArtifact,
} from "../../src/extractors/symbol-coordinates.js";

const NOW = "2026-03-04T05:06:07.000Z";
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function freezeTime() {
  setSystemTime(new Date(NOW));
  cleanups.push(() => setSystemTime());
}

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-manifest-mutation-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

const sha = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");

function manifestError(run: () => unknown): ManifestError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ManifestError);
    return error as ManifestError;
  }
  throw new Error("expected a ManifestError");
}

const extract = (symbol: ManifestSymbolRecord) =>
  extractManifestSymbolRecords([symbol], "m.yaml")[0];

describe("extractManifestSymbolRecords", () => {
  test("fills defaults and generates ids", () => {
    freezeTime();
    expect(
      extractManifestSymbolRecords([{ title: "alpha" }], "a/symbols.yaml"),
    ).toStrictEqual([
      {
        entity: {
          id: sha("a/symbols.yaml:alpha").slice(0, 16),
          type: "symbol",
          title: "alpha",
          status: "active",
          created_at: NOW,
          updated_at: NOW,
          source: "a/symbols.yaml",
        },
        relationships: [],
      },
    ]);
    expect(
      extract({
        id: "",
        title: "alpha",
        status: "",
        created_at: "",
        updated_at: "",
      })?.entity,
    ).toStrictEqual({
      id: sha("m.yaml:alpha").slice(0, 16),
      type: "symbol",
      title: "alpha",
      status: "active",
      created_at: NOW,
      updated_at: NOW,
      source: "m.yaml",
    });
  });

  test("copies every optional field", () => {
    const result = extract({
      id: "SYM-a",
      title: "alpha",
      status: "deprecated",
      created_at: "c",
      updated_at: "u",
      tags: ["t"],
      owner: "o",
      priority: "p",
      severity: "s",
      text_ref: "r",
      granularity_reason: "g",
      origin: { kind: "human" },
      symbol_kind: "function",
      symbol_role: "entry",
      sourceLine: 1,
      sourceColumn: 2,
      sourceEndLine: 3,
      sourceEndColumn: 4,
      sourceFile: "src/a.ts",
      source: "src/b.ts",
    });
    expect(result).toStrictEqual({
      entity: {
        id: "SYM-a",
        type: "symbol",
        title: "alpha",
        status: "deprecated",
        created_at: "c",
        updated_at: "u",
        source: "m.yaml",
        tags: ["t"],
        owner: "o",
        priority: "p",
        severity: "s",
        text_ref: "r",
        granularity_reason: "g",
        origin: { kind: "human" },
        symbol_kind: "function",
        symbol_role: "entry",
        sourceLine: 1,
        sourceColumn: 2,
        sourceEndLine: 3,
        sourceEndColumn: 4,
      } as never,
      relationships: [],
      sourceFile: "src/a.ts",
    });
  });

  test("ignores non-string kinds and non-number coordinates", () => {
    const entity = extract({
      id: "SYM-a",
      title: "alpha",
      created_at: "c",
      updated_at: "u",
      symbol_kind: 1,
      symbol_role: null,
      sourceLine: "1",
      sourceColumn: "2",
      sourceEndLine: "3",
      sourceEndColumn: "4",
    } as unknown as ManifestSymbolRecord)?.entity;
    expect(entity).toStrictEqual({
      id: "SYM-a",
      type: "symbol",
      title: "alpha",
      status: "active",
      created_at: "c",
      updated_at: "u",
      source: "m.yaml",
    });
    expect(
      extract({ id: "SYM-a", title: "x", source: "src/b.ts" })?.sourceFile,
    ).toBe("src/b.ts");
  });

  test("rejects a missing title and an invalid origin", () => {
    for (const title of [undefined, ""]) {
      const error = manifestError(() =>
        extract({ id: "SYM-a", title } as ManifestSymbolRecord),
      );
      expect(error.message).toBe("Missing required field: title");
      expect(error.filePath).toBe("m.yaml");
      expect(error.name).toBe("ManifestError");
      expect(error.classification).toBe(undefined);
    }
    expect(
      manifestError(() => extract({ id: "SYM-a", title: "x", origin: "human" }))
        .message,
    ).toBe(
      "Invalid origin for symbol SYM-a: origin must be a mapping with at least a kind",
    );
  });
});

describe("relationships", () => {
  const rels = (links: unknown, relationships?: unknown, id = "SYM-a") =>
    extract({ id, title: "x", links, relationships } as ManifestSymbolRecord)
      ?.relationships;

  test("reads string links, typed links and relationships", () => {
    expect(
      rels(
        [
          "REQ-1",
          null,
          5,
          { type: "covered_by" },
          { target: "TEST-1" },
          { type: 1, target: "x" },
          { type: "covered_by", target: "TEST-1" },
        ],
        [
          null,
          { type: "implements" },
          { target: "REQ-2" },
          { type: "publishes", target: "EVENT-1" },
        ],
      ),
    ).toStrictEqual([
      { type: "implements", from: "SYM-a", to: "REQ-1" },
      { type: "covered_by", from: "SYM-a", to: "TEST-1" },
      { type: "publishes", from: "SYM-a", to: "EVENT-1" },
    ]);
    expect(
      rels("REQ-1", { type: "implements", target: "REQ-1" }),
    ).toStrictEqual([]);
  });

  const TYPES = [
    "assumes",
    "constrained_by",
    "constrains",
    "consumes",
    "covered_by",
    "depends_on",
    "executable_for",
    "exempts",
    "guards",
    "implements",
    "publishes",
    "relates_to",
    "requires_predicate",
    "requires_property",
    "restates",
    "specified_by",
    "supersedes",
    "validates",
    "verified_by",
  ];

  test("rejects unknown types with the sorted list", () => {
    for (const relationships of [[{ type: "owns", target: "X" }], undefined]) {
      const links = relationships ? undefined : [{ type: "owns", target: "X" }];
      const error = manifestError(() => rels(links, relationships));
      expect(error.message).toBe(
        `Invalid relationship type "owns". Allowed types: ${TYPES.join(", ")}`,
      );
      expect(error.filePath).toBe("m.yaml");
    }
  });

  const PREFIX: Record<string, string> = {
    req: "REQ-1",
    scenario: "SCEN-1",
    test: "TEST-1",
    adr: "ADR-1",
    flag: "FLAG-1",
    event: "EVENT-1",
    symbol: "SYM-1",
    fact: "FACT-1",
  };
  const RULES: Array<[string, string, string]> = [
    ["depends_on", "req", "req"],
    ["executable_for", "symbol", "test"],
    ["specified_by", "req", "scenario"],
    ["verified_by", "req", "test"],
    ["verified_by", "scenario", "test"],
    ["validates", "test", "req"],
    ["validates", "test", "scenario"],
    ["implements", "symbol", "req"],
    ["covered_by", "symbol", "test"],
    ["constrained_by", "symbol", "adr"],
    ["constrains", "req", "fact"],
    ["requires_property", "req", "fact"],
    ["requires_predicate", "req", "fact"],
    ["guards", "flag", "symbol"],
    ["guards", "flag", "event"],
    ["guards", "flag", "req"],
    ["publishes", "symbol", "event"],
    ["consumes", "symbol", "event"],
    ["supersedes", "adr", "adr"],
    ["supersedes", "req", "req"],
    ["restates", "req", "req"],
    ["assumes", "scenario", "fact"],
    ["exempts", "req", "req"],
  ];

  test("accepts every allowed direction through links and relationships", () => {
    for (const [type, from, to] of RULES) {
      const fromId = PREFIX[from] as string;
      const toId = PREFIX[to] as string;
      expect(
        rels([{ type, target: toId }], [{ type, target: toId }], fromId),
      ).toStrictEqual([
        { type, from: fromId, to: toId },
        { type, from: fromId, to: toId },
      ]);
    }
  });

  test("names the allowed directions of a rejected relationship", () => {
    for (const type of TYPES.filter((name) => name !== "relates_to")) {
      const allowed = RULES.filter(([rule]) => rule === type).map(
        ([, from, to]) => `${from} -> ${to}`,
      );
      for (const [label, link, relationships] of [
        ["link", [{ type, target: "SYM-9" }], undefined],
        ["relationship", undefined, [{ type, target: "SYM-9" }]],
      ] as const) {
        const error = manifestError(() => rels(link, relationships, "fact-1"));
        expect([label, error.message]).toStrictEqual([
          label,
          `Invalid relationship direction for "${type}": fact -> symbol. Allowed: ${allowed.join(", ")}`,
        ]);
      }
    }
  });

  test("matches both endpoints of the rule", () => {
    expect(
      manifestError(() =>
        rels([{ type: "depends_on", target: "REQ-1" }], undefined, "SYM-1"),
      ).message,
    ).toBe(
      'Invalid relationship direction for "depends_on": symbol -> req. Allowed: req -> req',
    );
    expect(
      manifestError(() =>
        rels([{ type: "depends_on", target: "TEST-1" }], undefined, "REQ-2"),
      ).message,
    ).toBe(
      'Invalid relationship direction for "depends_on": req -> test. Allowed: req -> req',
    );
  });

  test("matches the rule type, not only the endpoints", () => {
    expect(
      manifestError(() =>
        rels([{ type: "depends_on", target: "TEST-1" }], undefined, "SYM-1"),
      ).message,
    ).toBe(
      'Invalid relationship direction for "depends_on": symbol -> test. Allowed: req -> req',
    );
  });

  test("infers every prefix case-insensitively and defers unknown ones", () => {
    for (const [kind, id] of Object.entries(PREFIX)) {
      const error = manifestError(() =>
        rels(
          [{ type: "exempts", target: id.toLowerCase() }],
          undefined,
          "flag-2",
        ),
      );
      expect(error.message).toBe(
        `Invalid relationship direction for "exempts": flag -> ${kind}. Allowed: req -> req`,
      );
    }
    expect(
      rels([{ type: "exempts", target: "OTHER-1" }], undefined, "SYM-1"),
    ).toStrictEqual([{ type: "exempts", from: "SYM-1", to: "OTHER-1" }]);
    expect(
      rels([{ type: "exempts", target: "SYM-1" }], undefined, "OTHER-1"),
    ).toStrictEqual([{ type: "exempts", from: "OTHER-1", to: "SYM-1" }]);
    expect(
      rels([{ type: "relates_to", target: "FACT-1" }], undefined, "SYM-1"),
    ).toStrictEqual([{ type: "relates_to", from: "SYM-1", to: "FACT-1" }]);
  });
});

describe("manifest strings", () => {
  test("parses symbols and clones records", () => {
    freezeTime();
    const yaml =
      "symbols:\n  - id: SYM-a\n    title: alpha\n    links: [REQ-1]\n";
    expect(extractFromManifestString(yaml, "s.yaml")).toStrictEqual([
      {
        entity: {
          id: "SYM-a",
          type: "symbol",
          title: "alpha",
          status: "active",
          created_at: NOW,
          updated_at: NOW,
          source: "s.yaml",
        },
        relationships: [{ type: "implements", from: "SYM-a", to: "REQ-1" }],
      },
    ]);
    expect(extractManifestSymbolRecordsString(yaml, "s.yaml")).toStrictEqual([
      { id: "SYM-a", title: "alpha", links: ["REQ-1"] },
    ]);
  });

  test("rejects documents without a symbols array", () => {
    for (const content of ["", "~", "symbols: 3", "other: 1", "symbols: {}"]) {
      for (const run of [
        extractFromManifestString,
        extractManifestSymbolRecordsString,
      ]) {
        const error = manifestError(() => run(content, "s.yaml"));
        expect([content, error.message, error.filePath]).toStrictEqual([
          content,
          "No symbols array found in manifest",
          "s.yaml",
        ]);
      }
    }
  });

  test("wraps YAML errors and keeps manifest errors", () => {
    for (const run of [
      extractFromManifestString,
      extractManifestSymbolRecordsString,
    ]) {
      const error = manifestError(() => run("symbols: [", "s.yaml"));
      expect(
        error.message.startsWith(
          "Failed to parse manifest: unexpected end of the stream",
        ),
      ).toBe(true);
      expect(error.filePath).toBe("s.yaml");
    }
    expect(
      manifestError(() =>
        extractFromManifestString("symbols:\n  - id: SYM-a\n", "s.yaml"),
      ).message,
    ).toBe("Missing required field: title");
    expect(
      manifestError(() =>
        extractFromManifestString("symbols:\n  - null\n", "s.yaml"),
      ).message.startsWith("Failed to parse manifest: "),
    ).toBe(true);
  });
});

describe("coordinate overlay", () => {
  const SOURCE = "// one\nexport function alpha() {}\n";
  const span = {
    sourceFile: "src/a.ts",
    sourceLine: 2,
    sourceColumn: 16,
    sourceEndLine: 2,
    sourceEndColumn: 21,
  };
  const symbols =
    "symbols:\n  - id: SYM-a\n    title: alpha\n    sourceFile: src/a.ts\n";

  test("overlays the sibling coordinate artifact", () => {
    freezeTime();
    const identityHash = coordinateIdentityHash({
      id: "SYM-a",
      title: "alpha",
      sourceFile: "src/a.ts",
    });
    const root = workspace({
      ".kb/symbols.yaml": symbols,
      ".kb/symbol-coordinates.yaml": writeCoordinateArtifact({
        "SYM-a": {
          ...span,
          identityHash,
          sourceHash: coordinateSourceHash(SOURCE),
        },
      }),
      "src/a.ts": SOURCE,
    });
    const manifest = path.join(root, ".kb/symbols.yaml");
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
    expect(extractFromManifest(manifest)).toStrictEqual([
      {
        entity: {
          id: "SYM-a",
          type: "symbol",
          title: "alpha",
          status: "active",
          created_at: NOW,
          updated_at: NOW,
          source: manifest,
          sourceLine: 2,
          sourceColumn: 16,
          sourceEndLine: 2,
          sourceEndColumn: 21,
        } as never,
        relationships: [],
        sourceFile: "src/a.ts",
      },
    ]);
  });

  test("uses an explicit artifact path, inline spans without one", () => {
    const root = workspace({
      ".kb/symbols.yaml": `${symbols}    sourceLine: 2\n    sourceColumn: 16\n    sourceEndLine: 2\n    sourceEndColumn: 21\n`,
      "elsewhere/coords.yaml": writeLegacyCoordinateArtifact({
        "SYM-a": { ...span, sourceColumn: 0, sourceEndColumn: 5 },
      }),
      "src/a.ts": SOURCE,
    });
    const manifest = path.join(root, ".kb/symbols.yaml");
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
    expect(
      readManifestWithCoordinateOverlay(
        manifest,
        path.join(root, "elsewhere/coords.yaml"),
      ),
    ).toStrictEqual([{ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" }]);
    expect(readManifestWithCoordinateOverlay(manifest, "")).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
  });

  test("prefers the working directory, then the workspace, for source text", () => {
    const root = workspace({
      ".kb/symbols.yaml": symbols,
      ".kb/symbol-coordinates.yaml": writeLegacyCoordinateArtifact({
        "SYM-a": span,
      }),
      "src/a.ts": SOURCE,
    });
    const other = workspace({ "src/a.ts": "nothing here\n" });
    const cwd = process.cwd();
    cleanups.push(() => process.chdir(cwd));
    const manifest = path.join(root, ".kb/symbols.yaml");
    process.chdir(other);
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
    ]);
    const empty = workspace();
    process.chdir(empty);
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
    process.chdir(root);
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
    const bare = workspace({
      ".kb/symbols.yaml": symbols,
      ".kb/symbol-coordinates.yaml": writeLegacyCoordinateArtifact({
        "SYM-a": span,
      }),
    });
    process.chdir(empty);
    expect(
      readManifestWithCoordinateOverlay(path.join(bare, ".kb/symbols.yaml")),
    ).toStrictEqual([{ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" }]);
    const dirSource = workspace({ "src/a.ts/x": "" });
    process.chdir(dirSource);
    expect(readManifestWithCoordinateOverlay(manifest)).toStrictEqual([
      { id: "SYM-a", title: "alpha", ...span },
    ]);
  });

  test("classifies coordinate artifact failures", () => {
    const root = workspace({
      ".kb/symbols.yaml": symbols,
      ".kb/symbol-coordinates.yaml": "[]",
    });
    const manifest = path.join(root, ".kb/symbols.yaml");
    const coordinates = path.join(root, ".kb/symbol-coordinates.yaml");
    const invalid = manifestError(() =>
      readManifestWithCoordinateOverlay(manifest),
    );
    expect(invalid.message).toBe("artifact root is not a mapping");
    expect(invalid.filePath).toBe(coordinates);
    expect(invalid.classification).toBe("coordinate-artifact");
    rmSync(coordinates);
    mkdirSync(coordinates);
    const unreadable = manifestError(() =>
      readManifestWithCoordinateOverlay(manifest),
    );
    expect(
      unreadable.message.startsWith("Failed to parse coordinate artifact: "),
    ).toBe(true);
    expect(unreadable.message.length).toBeGreaterThan(
      "Failed to parse coordinate artifact: ".length,
    );
    expect(unreadable.filePath).toBe(coordinates);
    expect(unreadable.classification).toBe("coordinate-artifact");
  });
});

describe("resolveBoundSymbolScope", () => {
  function scoped(manifest: string, files: Record<string, string> = {}) {
    const root = workspace({ ".kb/symbols.yaml": manifest, ...files });
    return { root, manifest: path.join(root, ".kb/symbols.yaml") };
  }

  test("hashes each scoped symbol's file, sorted and deduplicated", () => {
    const { manifest } = scoped(
      [
        "symbols:",
        "  - { id: SYM-b, title: b, sourceFile: src/b.ts }",
        "  - { id: SYM-a, title: a, sourceFile: '', source: ./src/a.ts }",
        "  - { id: SYM-c, title: c, source: src/gone.ts }",
        "  - { id: SYM-d, title: d, sourceFile: /elsewhere/d.ts }",
        "  - { id: SYM-e, title: e }",
        "  - { id: SYM-f, title: f, source: '' }",
        "  - { title: g, sourceFile: src/a.ts }",
        "  - { id: SYM-B, title: B, sourceFile: src/b.ts }",
        "  - { id: SYM-g, title: g, source: 5 }",
        "  - { id: SYM-a, title: a2 }",
        "",
      ].join("\n"),
      { "src/a.ts": "A", "src/b.ts": "B" },
    );
    expect(
      resolveBoundSymbolScope(manifest, [
        "SYM-b",
        "SYM-a",
        "SYM-b",
        "SYM-c",
        "SYM-d",
        "SYM-e",
        "SYM-f",
        "SYM-x",
        "SYM-B",
        "SYM-g",
      ]),
    ).toStrictEqual([
      { symbolId: "SYM-a", sourceHash: sha("A") },
      { symbolId: "SYM-b", sourceHash: sha("B") },
      { symbolId: "SYM-B", sourceHash: sha("B") },
      { symbolId: "SYM-c", sourceHash: "missing" },
      { symbolId: "SYM-d", sourceHash: OUTSIDE_WORKSPACE_SCOPE_HASH },
    ]);
    expect(OUTSIDE_WORKSPACE_SCOPE_HASH).toBe("outside-workspace");
    expect(resolveBoundSymbolScope(manifest, [])).toStrictEqual([]);
  });

  test("returns nothing for a missing manifest", () => {
    const root = workspace();
    expect(
      resolveBoundSymbolScope(path.join(root, ".kb/symbols.yaml"), ["SYM-a"]),
    ).toStrictEqual([]);
  });

  test("caches by modification time and size", () => {
    const { manifest, root } = scoped(
      "symbols:\n  - { id: SYM-a, title: a, sourceFile: src/a.ts }\n",
      {
        "src/a.ts": "one",
        "src/b.ts": "two",
      },
    );
    const source = path.join(root, "src/a.ts");
    utimesSync(source, 1000, 1000);
    utimesSync(manifest, 1000, 1000);
    expect(resolveBoundSymbolScope(manifest, ["SYM-a"])).toStrictEqual([
      { symbolId: "SYM-a", sourceHash: sha("one") },
    ]);
    writeFileSync(source, "uno");
    utimesSync(source, 1000, 1000);
    writeFileSync(
      manifest,
      "symbols:\n  - { id: SYM-a, title: a, sourceFile: src/b.ts }\n",
    );
    utimesSync(manifest, 1000, 1000);
    // Same stamps: both caches still answer.
    expect(resolveBoundSymbolScope(manifest, ["SYM-a"])).toStrictEqual([
      { symbolId: "SYM-a", sourceHash: sha("one") },
    ]);
    writeFileSync(
      manifest,
      "symbols:\n  - { id: SYM-a, title: a, sourceFile: src/b.ts }   \n",
    );
    expect(resolveBoundSymbolScope(manifest, ["SYM-a"])).toStrictEqual([
      { symbolId: "SYM-a", sourceHash: sha("two") },
    ]);
    writeFileSync(
      manifest,
      "symbols:\n  - { id: SYM-a, title: a, sourceFile: src/a.ts }\n",
    );
    writeFileSync(source, "changed");
    expect(resolveBoundSymbolScope(manifest, ["SYM-a"])).toStrictEqual([
      { symbolId: "SYM-a", sourceHash: sha("changed") },
    ]);
  });
});
