// implements REQ-vscode-traceability
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildCoordinatesMap,
  coarseCoordinateSpan,
  coordinateIdentityKey,
  coordinateMatchesCurrentDeclaration,
  coordinatesEqual,
  declaredAt,
  isCoarseAnchor,
  isEligible,
  isSha256Hash,
  legacyRecordMatchesCurrentExtraction,
  normalizeBoundCoordinateRecord,
  normalizeCoordinateRecord,
  publishCoordinateArtifact,
  readCoordinateArtifact,
  readOptionalTextFile,
  readSourceText,
  sortCoordinates,
  textField,
  titleSpan,
  withoutGeneratedCoordinates,
  writeCoordinateArtifact,
  writeLegacyCoordinateArtifact,
} from "../../src/tools/symbols.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-mcp-symbols-helpers-")),
  );
  roots.push(root);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), text);
  }
  return root;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const HASH = "a".repeat(64);
const span = {
  sourceFile: "src/a.ts",
  sourceLine: 2,
  sourceColumn: 2,
  sourceEndLine: 2,
  sourceEndColumn: 5,
};
const HEADER = `# symbol-coordinates.yaml
# GENERATED local cache — do not edit or commit (it is gitignored).
# Every \`kibi sync\` keeps it current; \`kibi sync --refresh-symbol-coordinates\` rebuilds it.
`;

describe("source eligibility", () => {
  test("only existing script sources inside the workspace count", () => {
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs"];
    const files: Record<string, string> = { "a.cjs": "", "B.TSX": "" };
    for (const ext of extensions) files[`a${ext}`] = "";
    files["a.py"] = "";
    const root = workspace(files);
    for (const name of [...extensions.map((ext) => `a${ext}`), "a.cjs"]) {
      expect(isEligible(name, root)).toBe(true);
    }
    expect(isEligible("B.TSX", root)).toBe(true);
    for (const name of ["a.py", "missing.ts", "../a.ts", "", undefined]) {
      expect(isEligible(name, root)).toBe(false);
    }
  });

  test("text fields prefer the refreshed entry", () => {
    expect(textField({ title: "a" }, { title: "b" }, "title")).toBe("a");
    expect(textField({ title: 5 as never }, { title: "b" }, "title")).toBe("b");
    expect(textField({}, { sourceFile: "s" }, "sourceFile")).toBe("s");
    expect(
      textField({}, { sourceFile: 5 as never }, "sourceFile"),
    ).toBeUndefined();
  });
});

describe("entry helpers", () => {
  test("coarse anchors are the four whole-file reasons", () => {
    for (const reason of [
      "test-suite",
      "extractor-miss",
      "module-level-behavior",
      "config-artifact",
    ]) {
      expect(isCoarseAnchor({ granularity_reason: reason })).toBe(true);
    }
    for (const reason of ["other", "", undefined, 5]) {
      expect(isCoarseAnchor({ granularity_reason: reason })).toBe(false);
    }
  });

  test("dropping generated coordinates keeps every other field", () => {
    expect(
      withoutGeneratedCoordinates({
        id: "S",
        title: "t",
        sourceFile: "f",
        sourceLine: 1,
        sourceColumn: 2,
        sourceEndLine: 3,
        sourceEndColumn: 4,
        coordinatesGeneratedAt: "now",
        extra: true,
      }),
    ).toStrictEqual({ id: "S", title: "t", sourceFile: "f", extra: true });
  });

  test("the identity key joins the text fields with NUL", () => {
    expect(
      coordinateIdentityKey({
        id: "a",
        title: "t",
        sourceFile: "f",
        granularity_reason: "g",
      }),
    ).toBe("a\u0000t\u0000f\u0000g");
    expect(
      coordinateIdentityKey({
        id: 1 as never,
        title: 2 as never,
        sourceFile: 3 as never,
        granularity_reason: 4,
      }),
    ).toBe("\u0000\u0000\u0000");
  });
});

describe("spans", () => {
  test("a title is found as a whole word, special characters literal", () => {
    expect(titleSpan("f", "a.b", "ab here\nx a.b y")).toStrictEqual({
      sourceFile: "f",
      sourceLine: 2,
      sourceColumn: 2,
      sourceEndLine: 2,
      sourceEndColumn: 5,
    });
    expect(titleSpan("f", "foo", "one\r\n\r\ntwo foo")).toStrictEqual({
      sourceFile: "f",
      sourceLine: 3,
      sourceColumn: 4,
      sourceEndLine: 3,
      sourceEndColumn: 7,
    });
    expect(titleSpan("f", "foo", "food")).toBeNull();
    expect(titleSpan("f", "", "x")).toBeNull();
    expect(titleSpan("f", 5, "5")).toBeNull();
  });

  test("a coarse span without a located title covers the file", () => {
    expect(coarseCoordinateSpan("f", "two", "one\ntwo")).toStrictEqual({
      sourceFile: "f",
      sourceLine: 2,
      sourceColumn: 0,
      sourceEndLine: 2,
      sourceEndColumn: 3,
    });
    for (const title of ["zzz", "", undefined, 5]) {
      expect(coarseCoordinateSpan("f", title, "abc\ndefg\nhi")).toStrictEqual({
        sourceFile: "f",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 2,
      });
    }
    expect(coarseCoordinateSpan("f", "x", "")).toStrictEqual({
      sourceFile: "f",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 1,
      sourceEndColumn: 0,
    });
  });

  test("a declaration is checked at its exact column", () => {
    const content = "x\n  foo()\n";
    expect(declaredAt(content, span, "A.foo")).toBe(true);
    expect(declaredAt(content, span, "foo")).toBe(true);
    expect(declaredAt(content, span, "A.")).toBe(false);
    expect(declaredAt(content, span, 5)).toBe(false);
    expect(declaredAt(content, span, "fooBar")).toBe(false);
    expect(declaredAt(content, { ...span, sourceColumn: 3 }, "foo")).toBe(
      false,
    );
    expect(declaredAt(content, { ...span, sourceLine: 9 }, "foo")).toBe(false);
    expect(
      declaredAt(content, { ...span, sourceLine: 9, sourceColumn: 0 }, "S"),
    ).toBe(false);
  });

  test("the current declaration must be in the same readable file", async () => {
    const root = workspace({ "src/a.ts": "x\n  foo()\n" });
    const entry = { sourceFile: "src/a.ts", title: "foo" };
    expect(await coordinateMatchesCurrentDeclaration(entry, span, root)).toBe(
      true,
    );
    expect(
      await coordinateMatchesCurrentDeclaration(
        { ...entry, sourceFile: "src/b.ts" },
        span,
        root,
      ),
    ).toBe(false);
    expect(
      await coordinateMatchesCurrentDeclaration(
        { ...entry, sourceFile: "src/missing.ts" },
        { ...span, sourceFile: "src/missing.ts" },
        root,
      ),
    ).toBe(false);
  });

  test("source text is read only from inside the workspace", async () => {
    const root = workspace({ "src/a.ts": "text" });
    expect(await readSourceText("src/a.ts", root)).toBe("text");
    expect(await readSourceText("src/missing.ts", root)).toBeNull();
    expect(await readSourceText("../a.ts", root)).toBeNull();
    expect(await readSourceText(undefined as never, root)).toBeNull();
  });

  test("coordinates are equal only when every field is", () => {
    expect(coordinatesEqual(span, { ...span })).toBe(true);
    for (const change of [
      { sourceFile: "x" },
      { sourceLine: 9 },
      { sourceColumn: 9 },
      { sourceEndLine: 9 },
      { sourceEndColumn: 9 },
    ]) {
      expect(coordinatesEqual(span, { ...span, ...change })).toBe(false);
    }
  });
});

describe("records", () => {
  test("a coordinate span must be whole, ordered and named", () => {
    expect(normalizeCoordinateRecord({ ...span, extra: 1 })).toStrictEqual(
      span,
    );
    expect(
      normalizeCoordinateRecord({
        ...span,
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 0,
      }),
    ).toStrictEqual({
      sourceFile: "src/a.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 1,
      sourceEndColumn: 0,
    });
    for (const value of [null, "x", [], 5]) {
      expect(normalizeCoordinateRecord(value)).toBeNull();
    }
    for (const change of [
      { sourceFile: "" },
      { sourceFile: 5 },
      { sourceLine: 0 },
      { sourceLine: 1.5 },
      { sourceLine: "2" },
      { sourceColumn: -1 },
      { sourceColumn: 0.5 },
      { sourceColumn: "2" },
      { sourceEndLine: 1 },
      { sourceEndLine: 2.5 },
      { sourceEndLine: "2" },
      { sourceEndColumn: -1 },
      { sourceEndColumn: 1.5 },
      { sourceEndColumn: "5" },
    ]) {
      expect(normalizeCoordinateRecord({ ...span, ...change })).toBeNull();
    }
  });

  test("hashes are exactly 64 lowercase hex digits", () => {
    expect(isSha256Hash(HASH)).toBe(true);
    for (const value of [
      "a".repeat(63),
      "a".repeat(65),
      `x${HASH}`,
      "A".repeat(64),
      5,
      undefined,
    ]) {
      expect(isSha256Hash(value)).toBe(false);
    }
  });

  test("a bound record needs a span and both hashes", () => {
    const bound = { ...span, identityHash: HASH, sourceHash: HASH };
    expect(normalizeBoundCoordinateRecord({ ...bound, x: 1 })).toStrictEqual(
      bound,
    );
    expect(normalizeBoundCoordinateRecord(null)).toBeNull();
    expect(normalizeBoundCoordinateRecord({ ...bound, sourceLine: 0 })).toBe(
      null,
    );
    expect(
      normalizeBoundCoordinateRecord({ ...bound, identityHash: "x" }),
    ).toBeNull();
    expect(
      normalizeBoundCoordinateRecord({ ...bound, sourceHash: "x" }),
    ).toBeNull();
  });

  test("bound records are sorted by locale and must be valid", () => {
    const bound = { ...span, identityHash: HASH, sourceHash: HASH };
    expect(Object.keys(sortCoordinates({ B: bound, a: bound }))).toStrictEqual([
      "a",
      "B",
    ]);
    expect(() => sortCoordinates({ X: span as never })).toThrow(
      "Invalid bound coordinate record for X; refusing to publish",
    );
  });
});

describe("artifact text", () => {
  test("no artifact or an empty one reads as empty legacy", () => {
    for (const content of [null, "", "~", "null"]) {
      expect(readCoordinateArtifact(content)).toStrictEqual({
        status: "legacy",
        coordinates: {},
      });
    }
  });

  test("malformed artifacts are refused with the reason", () => {
    expect(() => readCoordinateArtifact("a: [")).toThrow(
      "Failed to parse coordinate artifact: ",
    );
    expect(() => readCoordinateArtifact("- 1")).toThrow(
      "Coordinate artifact root must be a mapping",
    );
    expect(() => readCoordinateArtifact("coordinates: 1")).toThrow(
      "Coordinate artifact coordinates must be a mapping",
    );
    expect(() =>
      readCoordinateArtifact("coordinates:\n  X:\n    sourceFile: a\n"),
    ).toThrow("Coordinate artifact record 'X' has an invalid coordinate span");
    expect(() =>
      readCoordinateArtifact("version: 3\ncoordinates: {}\n"),
    ).toThrow("Unsupported coordinate artifact version: 3");
    expect(() =>
      readCoordinateArtifact(
        writeLegacyCoordinateArtifact({ X: span }).replace(
          "coordinates:",
          "version: 2\ncoordinates:",
        ),
      ),
    ).toThrow(
      "Coordinate artifact record 'X' is missing a valid identity/source binding or span",
    );
  });

  test("both formats read back as written", () => {
    const bound = { ...span, identityHash: HASH, sourceHash: HASH };
    expect(
      readCoordinateArtifact(writeCoordinateArtifact({ X: bound })),
    ).toStrictEqual({ status: "parsed", coordinates: { X: bound } });
    expect(
      readCoordinateArtifact(writeLegacyCoordinateArtifact({ X: span })),
    ).toStrictEqual({ status: "legacy", coordinates: { X: span } });
  });

  test("long values stay on one line and records are sorted", () => {
    const long = `src/${"a long folder name ".repeat(6)}file.ts`;
    const record = { ...span, sourceFile: long };
    expect(
      writeCoordinateArtifact({
        B: { ...record, identityHash: HASH, sourceHash: HASH },
        a: { ...record, identityHash: HASH, sourceHash: HASH },
      }),
    ).toBe(
      `${HEADER}version: 2\ncoordinates:\n${["a", "B"]
        .map(
          (id) =>
            `  ${id}:\n    sourceFile: ${long}\n    sourceLine: 2\n    sourceColumn: 2\n    sourceEndLine: 2\n    sourceEndColumn: 5\n    identityHash: ${HASH}\n    sourceHash: ${HASH}\n`,
        )
        .join("")}`,
    );
    expect(writeLegacyCoordinateArtifact({ B: record, a: record })).toBe(
      `${HEADER}coordinates:\n${["a", "B"]
        .map(
          (id) =>
            `  ${id}:\n    sourceFile: ${long}\n    sourceLine: 2\n    sourceColumn: 2\n    sourceEndLine: 2\n    sourceEndColumn: 5\n`,
        )
        .join("")}`,
    );
    expect(() => writeLegacyCoordinateArtifact({ X: {} as never })).toThrow(
      "Invalid legacy coordinate record for X; refusing to publish",
    );
  });
});

describe("legacy records", () => {
  test("a legacy record must still match the current source", async () => {
    const root = workspace({ "src/a.ts": "x\n  foo()\n" });
    const entry = { sourceFile: "src/a.ts", title: "foo" };
    expect(await legacyRecordMatchesCurrentExtraction(entry, span, root)).toBe(
      true,
    );
    expect(
      await legacyRecordMatchesCurrentExtraction(
        entry,
        { ...span, sourceEndColumn: 7 },
        root,
      ),
    ).toBe(true);
    expect(
      await legacyRecordMatchesCurrentExtraction(
        { ...entry, title: "bar" },
        span,
        root,
      ),
    ).toBe(false);
    expect(
      await legacyRecordMatchesCurrentExtraction(
        { ...entry, sourceFile: "src/b.ts" },
        span,
        root,
      ),
    ).toBe(false);
    const missing = { ...span, sourceFile: "src/missing.ts" };
    expect(
      await legacyRecordMatchesCurrentExtraction(
        { ...entry, sourceFile: "src/missing.ts" },
        missing,
        root,
      ),
    ).toBe(false);
  });

  test("a coarse legacy record must equal the coarse span", async () => {
    const root = workspace({ "src/a.ts": "x\n  foo()\n" });
    const entry = {
      sourceFile: "src/a.ts",
      title: "foo",
      granularity_reason: "test-suite",
    };
    expect(await legacyRecordMatchesCurrentExtraction(entry, span, root)).toBe(
      true,
    );
    expect(
      await legacyRecordMatchesCurrentExtraction(
        entry,
        { ...span, sourceEndColumn: 6 },
        root,
      ),
    ).toBe(false);
    expect(
      await legacyRecordMatchesCurrentExtraction(
        { ...entry, title: undefined },
        {
          ...span,
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 3,
          sourceEndColumn: 0,
        },
        root,
      ),
    ).toBe(true);
  });
});

describe("coordinate map and files", () => {
  test("only entries with an id, a span and readable source are bound", async () => {
    const root = workspace({ "src/a.ts": "x\n  foo()\n" });
    const entry = { id: "S", title: "foo", ...span };
    expect(
      await buildCoordinatesMap(
        [
          entry,
          { ...entry, id: 5 as never },
          { id: "T", title: "foo" },
          { ...entry, id: "U", sourceFile: "src/missing.ts" },
        ],
        root,
      ),
    ).toStrictEqual({
      S: {
        ...span,
        identityHash: sha(coordinateIdentityKey(entry)),
        sourceHash: sha("x\n  foo()\n"),
      },
    });
  });

  test("a missing file reads as none and other errors are raised", async () => {
    const root = workspace({ "a.txt": "text" });
    expect(await readOptionalTextFile(path.join(root, "a.txt"))).toBe("text");
    expect(await readOptionalTextFile(path.join(root, "none"))).toBeNull();
    await expect(readOptionalTextFile(root)).rejects.toThrow();
  });

  test("publication replaces the target and cleans up after a failure", async () => {
    const root = workspace({ "busy/keep.txt": "x" });
    const target = path.join(root, "out.yaml");
    await publishCoordinateArtifact(target, "content");
    expect(readFileSync(target, "utf8")).toBe("content");
    expect(existsSync(`${target}.kibi-tmp-${process.pid}`)).toBe(false);
    const busy = path.join(root, "busy");
    await expect(publishCoordinateArtifact(busy, "x")).rejects.toThrow();
    expect(existsSync(`${busy}.kibi-tmp-${process.pid}`)).toBe(false);
  });
});
