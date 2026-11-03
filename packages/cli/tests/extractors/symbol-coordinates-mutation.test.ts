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

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ManifestSymbolRecord } from "../../src/extractors/manifest.js";
import {
  CoordinateArtifactError,
  SYMBOL_COORDINATES_FORMAT_VERSION,
  type SymbolCoordinatesRecord,
  coarseCoordinateSpan,
  coordinateIdentityHash,
  coordinateIdentityKey,
  coordinateSourceHash,
  isValidCoordinateSpan,
  mergeCoordinatesWithManifest,
  parseCoordinateArtifact,
  readCoordinateArtifact,
  writeCoordinateArtifact,
  writeLegacyCoordinateArtifact,
} from "../../src/extractors/symbol-coordinates.js";

const parse = (content: string): unknown => parseCoordinateArtifact(content);
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const H1 = sha("one");
const H2 = sha("two");

const span = (
  patch: Partial<SymbolCoordinatesRecord> = {},
): SymbolCoordinatesRecord => ({
  sourceFile: "src/a.ts",
  sourceLine: 2,
  sourceColumn: 3,
  sourceEndLine: 4,
  sourceEndColumn: 5,
  ...patch,
});

const HEADER = `# symbol-coordinates.yaml
# GENERATED local cache — do not edit or commit (it is gitignored).
# Every \`kibi sync\` keeps it current; \`kibi sync --refresh-symbol-coordinates\` rebuilds it.
`;

function thrown(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected a throw");
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

describe("identity and source hashes", () => {
  test("joins identity fields with NUL and blanks non-strings", () => {
    expect(SYMBOL_COORDINATES_FORMAT_VERSION).toBe(2);
    expect(
      coordinateIdentityKey({
        id: "S",
        title: "t",
        sourceFile: "f",
        granularity_reason: "g",
      }),
    ).toBe("S\u0000t\u0000f\u0000g");
    expect(coordinateIdentityKey({ id: "S" })).toBe("S\u0000\u0000\u0000");
    expect(
      coordinateIdentityKey({ id: "S", title: 5 as unknown as string }),
    ).toBe("S\u0000\u0000\u0000");
    expect(coordinateIdentityHash({ id: "S", title: "t" })).toBe(
      sha("S\u0000t\u0000\u0000"),
    );
    expect(coordinateSourceHash("abc")).toBe(sha("abc"));
  });
});

describe("coarseCoordinateSpan", () => {
  test("anchors on the first whole-word title match", () => {
    expect(
      coarseCoordinateSpan("f.ts", "run", "xrun runner\r\n  run(); run\nrun"),
    ).toStrictEqual({
      sourceFile: "f.ts",
      sourceLine: 2,
      sourceColumn: 2,
      sourceEndLine: 2,
      sourceEndColumn: 5,
    });
    expect(coarseCoordinateSpan("f.ts", "a.b", "axb\nz a.b")).toStrictEqual({
      sourceFile: "f.ts",
      sourceLine: 2,
      sourceColumn: 2,
      sourceEndLine: 2,
      sourceEndColumn: 5,
    });
  });

  test("falls back to the whole file", () => {
    expect(coarseCoordinateSpan("f.ts", "", "  abc\nlast line")).toStrictEqual({
      sourceFile: "f.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 2,
      sourceEndColumn: 9,
    });
    expect(coarseCoordinateSpan("f.ts", "zzz", "a\r\nbb\r\nccc")).toStrictEqual(
      {
        sourceFile: "f.ts",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 3,
      },
    );
    expect(coarseCoordinateSpan("f.ts", "zzz", "")).toStrictEqual({
      sourceFile: "f.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 1,
      sourceEndColumn: 0,
    });
  });
});

describe("coarseCoordinateSpan bounds", () => {
  test("never reads past the last line", () => {
    expect(coarseCoordinateSpan("f.ts", "undefined", "a\nb")).toStrictEqual({
      sourceFile: "f.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 2,
      sourceEndColumn: 1,
    });
  });
});

describe("isValidCoordinateSpan", () => {
  test("accepts boundary values", () => {
    expect(
      isValidCoordinateSpan({
        sourceFile: "f",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 0,
      }),
    ).toBe(true);
  });

  test("rejects each invalid field", () => {
    const bad: Array<Partial<Record<keyof SymbolCoordinatesRecord, unknown>>> =
      [
        { sourceFile: "" },
        { sourceFile: 5 },
        { sourceLine: 0 },
        { sourceLine: 1.5 },
        { sourceLine: "2" },
        { sourceColumn: -1 },
        { sourceColumn: 0.5 },
        { sourceColumn: "3" },
        { sourceEndLine: 1 },
        { sourceEndLine: 4.5 },
        { sourceEndLine: "4" },
        { sourceEndColumn: -1 },
        { sourceEndColumn: 0.5 },
        { sourceEndColumn: "5" },
      ];
    for (const patch of bad) {
      expect([
        patch,
        isValidCoordinateSpan({ ...span(), ...patch }),
      ]).toStrictEqual([patch, false]);
    }
    for (const value of [null, [], "x", undefined]) {
      expect(isValidCoordinateSpan(value)).toBe(false);
    }
  });
});

describe("parseCoordinateArtifact", () => {
  test("reports YAML errors with their message", () => {
    const result = parseCoordinateArtifact("a: [");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(
      result.reason.startsWith(
        "unexpected end of the stream within a flow collection",
      ),
    ).toBe(true);
  });

  test("treats empty documents as empty legacy artifacts", () => {
    for (const content of ["", "null", "~", "# only a comment\n"]) {
      expect(parse(content)).toStrictEqual({
        status: "legacy",
        coordinates: {},
      });
    }
    expect(parse("version: 2")).toStrictEqual({
      status: "parsed",
      formatVersion: 2,
      coordinates: {},
    });
    expect(parse("other: 1")).toStrictEqual({
      status: "legacy",
      coordinates: {},
    });
  });

  test("rejects non-mapping roots and coordinates", () => {
    for (const content of ["[]", "5", "text"]) {
      expect(parse(content)).toStrictEqual({
        status: "invalid",
        reason: "artifact root is not a mapping",
      });
    }
    for (const content of [
      "coordinates: []",
      "coordinates: 3",
      "coordinates: x",
    ]) {
      expect(parse(content)).toStrictEqual({
        status: "invalid",
        reason: "coordinates is not a mapping",
      });
    }
    expect(parse("coordinates: ~")).toStrictEqual({
      status: "legacy",
      coordinates: {},
    });
  });

  const yamlOf = (record: object, version?: number) =>
    JSON.stringify({
      ...(version === undefined ? {} : { version }),
      coordinates: { "SYM-a": record },
    });

  test("rejects invalid records and bad hashes", () => {
    const invalid = {
      status: "invalid",
      reason: "record 'SYM-a' has an invalid coordinate span",
    };
    expect(parse(yamlOf({ ...span(), sourceLine: 0 }))).toStrictEqual(invalid);
    expect(
      parse(JSON.stringify({ coordinates: { "SYM-a": [1] } })),
    ).toStrictEqual(invalid);
    for (const hash of [
      null,
      "",
      "abc",
      H1.toUpperCase(),
      `${H1}0`,
      `x${H1.slice(1)}`,
    ]) {
      expect(
        parse(yamlOf({ ...span(), identityHash: hash, sourceHash: H2 })),
      ).toStrictEqual(invalid);
      expect(
        parse(yamlOf({ ...span(), identityHash: H1, sourceHash: hash })),
      ).toStrictEqual(invalid);
    }
    const nullValued = parse(
      "coordinates:\n  SYM-a:\n    identityHash:\n" +
        "    sourceFile: f\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 0\n",
    );
    expect(nullValued).toStrictEqual(invalid);
  });

  test("rejects non-string hashes, source files and null records", () => {
    const invalid = {
      status: "invalid",
      reason: "record 'SYM-a' has an invalid coordinate span",
    };
    expect(
      parse(yamlOf({ ...span(), identityHash: [H1], sourceHash: H2 })),
    ).toStrictEqual(invalid);
    expect(
      parse(yamlOf({ ...span(), identityHash: H1, sourceHash: [H2] })),
    ).toStrictEqual(invalid);
    expect(parse(yamlOf({ ...span(), sourceFile: ["x"] }))).toStrictEqual(
      invalid,
    );
    expect(parse("coordinates:\n  SYM-a:\n")).toStrictEqual(invalid);
  });

  test("returns legacy spans without bindings", () => {
    expect(
      parse(
        yamlOf({
          ...span(),
          identityHash: H1,
          sourceHash: H2,
          extra: undefined,
        }),
      ),
    ).toStrictEqual({ status: "legacy", coordinates: { "SYM-a": span() } });
    expect(parse(yamlOf(span()))).toStrictEqual({
      status: "legacy",
      coordinates: { "SYM-a": span() },
    });
  });

  test("rejects unknown versions", () => {
    expect(parse(yamlOf(span(), 1))).toStrictEqual({
      status: "invalid",
      reason: "unsupported or missing artifact version: 1",
    });
    expect(parse('version: "2"')).toStrictEqual({
      status: "invalid",
      reason: "unsupported or missing artifact version: 2",
    });
    expect(parse("version: ~")).toStrictEqual({
      status: "invalid",
      reason: "unsupported or missing artifact version: null",
    });
  });

  test("requires both bindings in a versioned artifact", () => {
    const missing = {
      status: "invalid",
      reason:
        "record 'SYM-a' is missing its identity or source binding in a versioned artifact",
    };
    expect(parse(yamlOf(span(), 2))).toStrictEqual(missing);
    expect(parse(yamlOf({ ...span(), identityHash: H1 }, 2))).toStrictEqual(
      missing,
    );
    expect(parse(yamlOf({ ...span(), sourceHash: H2 }, 2))).toStrictEqual(
      missing,
    );
    expect(
      parse(yamlOf({ ...span(), identityHash: H1, sourceHash: H2 }, 2)),
    ).toStrictEqual({
      status: "parsed",
      formatVersion: 2,
      coordinates: { "SYM-a": { ...span(), identityHash: H1, sourceHash: H2 } },
    });
  });
});

describe("writers and reader", () => {
  test("writes a sorted, bound version 2 artifact", () => {
    const text = writeCoordinateArtifact({
      b: { ...span(), identityHash: H1, sourceHash: H2 },
      B: { ...span({ sourceFile: "x.ts" }), identityHash: H2, sourceHash: H1 },
      a: { ...span(), identityHash: H1, sourceHash: H2 },
    });
    expect(text).toBe(
      `${HEADER}version: 2\ncoordinates:\n` +
        `  a:\n    identityHash: ${H1}\n    sourceHash: ${H2}\n    sourceColumn: 3\n    sourceEndColumn: 5\n    sourceEndLine: 4\n    sourceFile: src/a.ts\n    sourceLine: 2\n` +
        `  b:\n    identityHash: ${H1}\n    sourceHash: ${H2}\n    sourceColumn: 3\n    sourceEndColumn: 5\n    sourceEndLine: 4\n    sourceFile: src/a.ts\n    sourceLine: 2\n` +
        `  B:\n    identityHash: ${H2}\n    sourceHash: ${H1}\n    sourceColumn: 3\n    sourceEndColumn: 5\n    sourceEndLine: 4\n    sourceFile: x.ts\n    sourceLine: 2\n`,
    );
    expect(readCoordinateArtifact(text)).toStrictEqual({
      coordinates: {
        a: { ...span(), identityHash: H1, sourceHash: H2 },
        b: { ...span(), identityHash: H1, sourceHash: H2 },
        B: {
          ...span({ sourceFile: "x.ts" }),
          identityHash: H2,
          sourceHash: H1,
        },
      },
    });
    expect(writeCoordinateArtifact({})).toBe(
      `${HEADER}version: 2\ncoordinates: {}\n`,
    );
  });

  test("refuses invalid spans and bindings", () => {
    const span5 = {
      ...span(),
      sourceLine: 0,
      identityHash: H1,
      sourceHash: H2,
    };
    const first = thrown(() => writeCoordinateArtifact({ s: span5 }));
    expect(first).toBeInstanceOf(CoordinateArtifactError);
    expect(first.name).toBe("CoordinateArtifactError");
    expect(first.message).toBe(
      "refusing to publish an invalid or missing coordinate span for s",
    );
    expect(
      thrown(() =>
        writeCoordinateArtifact({ s: undefined as unknown as typeof span5 }),
      ).message,
    ).toBe("refusing to publish an invalid or missing coordinate span for s");
    for (const binding of [
      { identityHash: H1 },
      { sourceHash: H2 },
      { identityHash: "x", sourceHash: H2 },
      { identityHash: H1, sourceHash: "y" },
    ]) {
      const error = thrown(() =>
        writeCoordinateArtifact({ s: { ...span(), ...binding } }),
      );
      expect(error).toBeInstanceOf(CoordinateArtifactError);
      expect(error.message).toBe(
        "refusing to publish an invalid or missing identityHash/sourceHash binding for s",
      );
    }
  });

  test("writes a sorted legacy artifact without bindings", () => {
    const text = writeLegacyCoordinateArtifact({
      b: { ...span(), identityHash: H1 } as SymbolCoordinatesRecord,
      B: span({ sourceFile: "x.ts" }),
      a: span(),
    });
    const body = (file: string) =>
      `    sourceColumn: 3\n    sourceEndColumn: 5\n    sourceEndLine: 4\n    sourceFile: ${file}\n    sourceLine: 2\n`;
    expect(text).toBe(
      `${HEADER}coordinates:\n  a:\n${body("src/a.ts")}  b:\n${body("src/a.ts")}  B:\n${body("x.ts")}`,
    );
    expect(readCoordinateArtifact(text)).toStrictEqual({
      coordinates: { a: span(), b: span(), B: span({ sourceFile: "x.ts" }) },
    });
    for (const entry of [undefined, span({ sourceColumn: -1 })]) {
      const error = thrown(() =>
        writeLegacyCoordinateArtifact({ q: entry as SymbolCoordinatesRecord }),
      );
      expect(error).toBeInstanceOf(CoordinateArtifactError);
      expect(error.message).toBe(
        "refusing to publish an invalid or missing legacy coordinate span for q",
      );
    }
  });

  test("never folds long values", () => {
    const file = `src/${"long directory name ".repeat(6)}file.ts`;
    const v2 = writeCoordinateArtifact({
      a: { ...span({ sourceFile: file }), identityHash: H1, sourceHash: H2 },
    });
    expect(v2).toContain(`    sourceFile: ${file}\n`);
    const v1 = writeLegacyCoordinateArtifact({ a: span({ sourceFile: file }) });
    expect(v1).toContain(`    sourceFile: ${file}\n`);
  });

  test("the reader throws the parse failure reason", () => {
    const error = thrown(() => readCoordinateArtifact("[]"));
    expect(error).toBeInstanceOf(CoordinateArtifactError);
    expect(error.message).toBe("artifact root is not a mapping");
  });
});

describe("mergeCoordinatesWithManifest", () => {
  const SOURCE = "// header\nexport function runTask() {}\n";
  const declared = span({
    sourceFile: "src/a.ts",
    sourceLine: 2,
    sourceColumn: 16,
    sourceEndLine: 2,
    sourceEndColumn: 23,
  });
  const record = (
    patch: Partial<ManifestSymbolRecord> = {},
  ): ManifestSymbolRecord => ({
    id: "SYM-a",
    title: "runTask",
    sourceFile: "src/a.ts",
    ...patch,
  });
  const identity = (rec: ManifestSymbolRecord) =>
    coordinateIdentityHash({
      id: rec.id as string,
      title: rec.title,
      sourceFile: (rec.sourceFile || rec.source) as string,
      granularity_reason: rec.granularity_reason,
    });
  const reader = (files: Record<string, string | null>) => {
    const calls: string[] = [];
    const resolveSourceText = (file: string) => {
      calls.push(file);
      return file in files ? (files[file] as string | null) : null;
    };
    return { calls, resolveSourceText };
  };
  const parsed = (coordinates: Record<string, unknown>) =>
    ({ status: "parsed", formatVersion: 2, coordinates }) as never;
  const legacy = (coordinates: Record<string, unknown>) =>
    ({ status: "legacy", coordinates }) as never;
  const overlay = (rec: ManifestSymbolRecord, s: SymbolCoordinatesRecord) => ({
    ...rec,
    ...s,
  });

  test("throws for an invalid parsed artifact", () => {
    const error = thrown(() =>
      mergeCoordinatesWithManifest([record()], {
        status: "invalid",
        reason: "broken",
      }),
    );
    expect(error).toBeInstanceOf(CoordinateArtifactError);
    expect(error.message).toBe("broken");
  });

  test("strips every generated field and skips records without ids", () => {
    const generated = {
      sourceLine: 9,
      sourceColumn: 9,
      sourceEndLine: 9,
      sourceEndColumn: 9,
      coordinatesGeneratedAt: "now",
    };
    const { resolveSourceText } = reader({});
    expect(
      mergeCoordinatesWithManifest(
        [
          record({ ...generated, sourceFile: "" }),
          { title: "x", ...generated },
          record({ id: 5 as unknown as string, ...generated }),
        ],
        legacy({}),
        { resolveSourceText },
      ),
    ).toStrictEqual([
      record({ sourceFile: "" }),
      { title: "x" },
      record({ id: 5 as unknown as string }),
    ]);
  });

  test("applies a bound record only when identity and source match", () => {
    const rec = record({ granularity_reason: "why" });
    const bound = {
      ...declared,
      identityHash: identity(rec),
      sourceHash: sha(SOURCE),
    };
    const { resolveSourceText, calls } = reader({ "src/a.ts": SOURCE });
    const other = record({ id: "SYM-b", granularity_reason: "why" });
    const boundB = {
      ...declared,
      identityHash: identity(other),
      sourceHash: sha(SOURCE),
    };
    expect(
      mergeCoordinatesWithManifest(
        [rec, other],
        parsed({ "SYM-a": bound, "SYM-b": boundB }),
        { resolveSourceText },
      ),
    ).toStrictEqual([overlay(rec, declared), overlay(other, declared)]);
    expect(calls).toStrictEqual(["src/a.ts"]);
  });

  test("binds the identity to the legacy source field", () => {
    const rec: ManifestSymbolRecord = {
      id: "SYM-a",
      title: "runTask",
      source: "src/a.ts",
    };
    const bound = {
      ...declared,
      identityHash: identity(rec),
      sourceHash: sha(SOURCE),
    };
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    expect(
      mergeCoordinatesWithManifest([rec], parsed({ "SYM-a": bound }), {
        resolveSourceText,
      }),
    ).toStrictEqual([{ ...rec, ...declared }]);
    const both: ManifestSymbolRecord = {
      ...rec,
      sourceFile: "src/a.ts",
      source: "other.ts",
    };
    expect(
      mergeCoordinatesWithManifest(
        [both],
        parsed({
          "SYM-a": {
            ...declared,
            identityHash: identity({ ...both, source: undefined }),
            sourceHash: sha(SOURCE),
          },
        }),
        { resolveSourceText },
      ),
    ).toStrictEqual([{ ...both, ...declared }]);
  });

  test("drops bound records that do not match", () => {
    const rec = record();
    const good = {
      ...declared,
      identityHash: identity(rec),
      sourceHash: sha(SOURCE),
    };
    const { resolveSourceText } = reader({
      "src/a.ts": SOURCE,
      "src/b.ts": SOURCE,
    });
    const cases: Array<[ManifestSymbolRecord, Record<string, unknown>]> = [
      [rec, { ...good, identityHash: "x" }],
      [rec, { ...good, sourceHash: "x" }],
      [rec, { ...good, identityHash: undefined }],
      [rec, { ...good, sourceHash: undefined }],
      [rec, { ...good, identityHash: H1 }],
      [rec, { ...good, sourceHash: H1 }],
      [rec, { ...good, sourceLine: 0 }],
      [record({ title: "other" }), good],
      [record({ granularity_reason: "g" }), good],
      [record({ sourceFile: "src/b.ts" }), { ...good, sourceFile: "src/a.ts" }],
      [
        record({ sourceFile: undefined }),
        { ...good, identityHash: identity(record({ sourceFile: undefined })) },
      ],
    ];
    for (const [input, entry] of cases) {
      expect([
        entry,
        mergeCoordinatesWithManifest([input], parsed({ "SYM-a": entry }), {
          resolveSourceText,
        }),
      ]).toStrictEqual([entry, [input]]);
    }
    const unreadable = reader({ "src/a.ts": null });
    expect(
      mergeCoordinatesWithManifest([rec], parsed({ "SYM-a": good }), {
        resolveSourceText: unreadable.resolveSourceText,
      }),
    ).toStrictEqual([rec]);
  });

  test("validates legacy spans against the live declaration", () => {
    const { resolveSourceText, calls } = reader({ "src/a.ts": SOURCE });
    const rec = record({ title: "Module.runTask" });
    const other = record({ id: "SYM-b", title: "runTask" });
    expect(
      mergeCoordinatesWithManifest(
        [rec, other],
        legacy({ "SYM-a": declared, "SYM-b": declared }),
        { resolveSourceText },
      ),
    ).toStrictEqual([overlay(rec, declared), overlay(other, declared)]);
    expect(calls).toStrictEqual(["src/a.ts"]);
  });

  test("drops legacy spans that do not match the declaration", () => {
    const { resolveSourceText } = reader({
      "src/a.ts": SOURCE,
      "src/b.ts": SOURCE,
      "src/none.ts": null,
    });
    const cases: Array<
      [ManifestSymbolRecord, SymbolCoordinatesRecord | Record<string, unknown>]
    > = [
      [record(), { ...declared, sourceLine: 0 }],
      [record({ sourceFile: undefined }), declared],
      [record({ sourceFile: "src/b.ts" }), declared],
      [record({ title: undefined }), declared],
      [record({ title: "Module." }), declared],
      [
        record({ sourceFile: "src/none.ts" }),
        { ...declared, sourceFile: "src/none.ts" },
      ],
      [record(), { ...declared, sourceLine: 3, sourceEndLine: 3 }],
      [record(), { ...declared, sourceLine: 9, sourceEndLine: 9 }],
      [record(), { ...declared, sourceColumn: 15 }],
      [record(), { ...declared, sourceColumn: 17 }],
      [record({ title: "runTask() {}x" }), { ...declared, sourceColumn: 16 }],
    ];
    for (const [input, entry] of cases) {
      expect([
        input,
        entry,
        mergeCoordinatesWithManifest([input], legacy({ "SYM-a": entry }), {
          resolveSourceText,
        }),
      ]).toStrictEqual([input, entry, [input]]);
    }
    expect(
      mergeCoordinatesWithManifest(
        [record({ title: "runTask() {}" })],
        legacy({ "SYM-a": declared }),
        { resolveSourceText },
      ),
    ).toStrictEqual([overlay(record({ title: "runTask() {}" }), declared)]);
  });

  test("looks records up only by a string id", () => {
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    const numeric = record({ id: 5 as unknown as string });
    const missing: ManifestSymbolRecord = {
      title: "runTask",
      sourceFile: "src/a.ts",
    };
    expect(
      mergeCoordinatesWithManifest(
        [numeric, missing],
        legacy({ "5": declared, undefined: declared }),
        {
          resolveSourceText,
        },
      ),
    ).toStrictEqual([numeric, missing]);
  });

  test("requires a bound span in the record's own source file", () => {
    const rec = record({ sourceFile: "src/b.ts" });
    const entry = {
      ...declared,
      sourceFile: "src/a.ts",
      identityHash: identity(rec),
      sourceHash: sha(SOURCE),
    };
    const { resolveSourceText } = reader({
      "src/a.ts": SOURCE,
      "src/b.ts": SOURCE,
    });
    expect(
      mergeCoordinatesWithManifest([rec], parsed({ "SYM-a": entry }), {
        resolveSourceText,
      }),
    ).toStrictEqual([rec]);
    const noFile: ManifestSymbolRecord = { id: "SYM-a", title: "runTask" };
    const unbound = {
      ...declared,
      identityHash: identity(noFile),
      sourceHash: sha(SOURCE),
    };
    expect(
      mergeCoordinatesWithManifest([noFile], parsed({ "SYM-a": unbound }), {
        resolveSourceText,
      }),
    ).toStrictEqual([noFile]);
  });

  test("validates unparsed artifact spans before matching them", () => {
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    for (const patch of [{ sourceEndColumn: -1 }, { sourceEndLine: 1 }]) {
      expect(
        mergeCoordinatesWithManifest(
          [record()],
          { coordinates: { "SYM-a": { ...declared, ...patch } } },
          {
            resolveSourceText,
          },
        ),
      ).toStrictEqual([record()]);
    }
  });

  test("falls back to source when sourceFile is not a string", () => {
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    const rec = record({
      sourceFile: ["src/x.ts"] as unknown as string,
      source: "src/a.ts",
    });
    expect(
      mergeCoordinatesWithManifest([rec], legacy({ "SYM-a": declared }), {
        resolveSourceText,
      }),
    ).toStrictEqual([{ ...rec, ...declared }]);
  });

  test("needs a string title and a string source file for legacy spans", () => {
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    for (const patch of [
      { title: 7 },
      { title: ["runTask"] },
      { sourceFile: ["src/a.ts"] },
    ]) {
      const rec = record(patch as unknown as Partial<ManifestSymbolRecord>);
      expect(
        mergeCoordinatesWithManifest([rec], legacy({ "SYM-a": declared }), {
          resolveSourceText,
        }),
      ).toStrictEqual([rec]);
    }
  });

  test("uses inline coordinates only without an artifact", () => {
    const inline = record({ ...declared });
    const { resolveSourceText } = reader({ "src/a.ts": SOURCE });
    expect(
      mergeCoordinatesWithManifest([inline], null, { resolveSourceText }),
    ).toStrictEqual([inline]);
    expect(
      mergeCoordinatesWithManifest([inline], legacy({}), { resolveSourceText }),
    ).toStrictEqual([record()]);
    expect(
      mergeCoordinatesWithManifest(
        [inline],
        { coordinates: {} },
        { resolveSourceText },
      ),
    ).toStrictEqual([record()]);
    for (const field of [
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
    ] as const) {
      const partial = record({ ...declared, [field]: String(declared[field]) });
      expect([
        field,
        mergeCoordinatesWithManifest([partial], null, { resolveSourceText }),
      ]).toStrictEqual([field, [record()]]);
    }
    const sourceOnly: ManifestSymbolRecord = {
      id: "SYM-a",
      title: "runTask",
      source: "src/a.ts",
      ...declared,
      sourceFile: "",
    };
    expect(
      mergeCoordinatesWithManifest([sourceOnly], null, { resolveSourceText }),
    ).toStrictEqual([{ ...sourceOnly, sourceFile: "src/a.ts" }]);
    const noSource: ManifestSymbolRecord = {
      id: "SYM-a",
      title: "runTask",
      sourceLine: declared.sourceLine,
      sourceColumn: declared.sourceColumn,
      sourceEndLine: declared.sourceEndLine,
      sourceEndColumn: declared.sourceEndColumn,
    };
    const stripped = { id: "SYM-a", title: "runTask" };
    expect(
      mergeCoordinatesWithManifest([noSource], null, { resolveSourceText }),
    ).toStrictEqual([stripped]);
  });

  test("reads sources relative to the working directory by default", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-coord-mutation-"));
    const cwd = process.cwd();
    cleanups.push(() => {
      process.chdir(cwd);
      rmSync(root, { recursive: true, force: true });
    });
    writeFileSync(path.join(root, "a.ts"), SOURCE);
    process.chdir(root);
    const rec = record({ sourceFile: "a.ts" });
    const entry = { ...declared, sourceFile: "a.ts" };
    expect(
      mergeCoordinatesWithManifest([rec], legacy({ "SYM-a": entry })),
    ).toStrictEqual([overlay(rec, entry)]);
    const missing = record({ sourceFile: "gone.ts" });
    expect(
      mergeCoordinatesWithManifest(
        [missing],
        legacy({ "SYM-a": { ...declared, sourceFile: "gone.ts" } }),
      ),
    ).toStrictEqual([missing]);
    const outside = record({ sourceFile: "../a.ts" });
    expect(
      mergeCoordinatesWithManifest(
        [outside],
        legacy({ "SYM-a": { ...declared, sourceFile: "../a.ts" } }),
      ),
    ).toStrictEqual([outside]);
  });
});
