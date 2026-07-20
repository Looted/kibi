/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import * as symbolsTsExports from "../../src/extractors/symbols-ts.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinatesWithTsMorph,
} from "../../src/extractors/symbols-ts.js";

function writeFixture(
  workspaceRoot: string,
  relativePath: string,
  content: string,
): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
  return absolutePath;
}

function createEntry(
  id: string,
  title: string,
  sourceFile?: string,
): ManifestSymbolEntry {
  return sourceFile ? { id, title, sourceFile } : { id, title };
}

function requireEntry(
  entry: ManifestSymbolEntry | undefined,
): ManifestSymbolEntry {
  if (!entry) {
    throw new Error("Expected manifest entry");
  }

  return entry;
}

function expectCoordinates(
  entry: ManifestSymbolEntry,
  expectedLine: number,
): void {
  expect(entry.sourceLine).toBe(expectedLine);
  expect(typeof entry.sourceColumn).toBe("number");
  expect(typeof entry.sourceEndLine).toBe("number");
  expect(typeof entry.sourceEndColumn).toBe("number");
  expect(entry.sourceEndLine).toBeGreaterThanOrEqual(expectedLine);
  expect(entry.sourceEndColumn).toBeGreaterThanOrEqual(0);
  expect(typeof entry.coordinatesGeneratedAt).toBe("string");
  expect(Number.isNaN(Date.parse(entry.coordinatesGeneratedAt ?? ""))).toBe(
    false,
  );
}

function expectUnchanged(
  actual: ManifestSymbolEntry,
  expected: ManifestSymbolEntry,
): void {
  expect(actual).toEqual(expected);
  expect(actual.sourceLine).toBeUndefined();
  expect(actual.sourceColumn).toBeUndefined();
  expect(actual.sourceEndLine).toBeUndefined();
  expect(actual.sourceEndColumn).toBeUndefined();
  expect(actual.coordinatesGeneratedAt).toBeUndefined();
}

describe("enrichSymbolCoordinatesWithTsMorph", () => {
  let workspaceRoot = "";
  let exportsFile = "";
  let methodsFile = "";
  let internalFile = "";
  let multipleMatchesFile = "";
  let unparseableFile = "";
  let unsupportedCssFile = "";
  let unsupportedJsonFile = "";
  let invalidSourcePath = "";

  beforeAll(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-symbols-ts-"));

    exportsFile = writeFixture(
      workspaceRoot,
      "fixtures/exports.ts",
      [
        "export function myExportedFunc() { return 1; }",
        "export class MyClass {",
        "  methodOnExportedClass() { return 3; }",
        "}",
        "export interface MyInterface {",
        "  foo: string;",
        "}",
        "export type MyType = string | number;",
        "export enum MyEnum { A, B }",
        "export const myConst = 42;",
      ].join("\n"),
    );

    methodsFile = writeFixture(
      workspaceRoot,
      "fixtures/methods.ts",
      ["export class MethodHost {", "  myMethod() { return 3; }", "}"].join(
        "\n",
      ),
    );

    writeFixture(
      workspaceRoot,
      "fixtures/class-members.ts",
      [
        "export class UploadPageComponent {",
        "  protected processingProgressLabel = computed(() => 'Processing started');",
        "  get processingProgressAriaLabel() {",
        "    return this.processingProgressLabel;",
        "  }",
        "}",
      ].join("\n"),
    );

    internalFile = writeFixture(
      workspaceRoot,
      "fixtures/internal.ts",
      "function myInternalFunc() { return 2; }\n",
    );

    multipleMatchesFile = writeFixture(
      workspaceRoot,
      "fixtures/multiple-exported.ts",
      [
        "export interface SharedName {",
        "  foo: string;",
        "}",
        "export const SharedName = 42;",
      ].join("\n"),
    );

    unparseableFile = writeFixture(
      workspaceRoot,
      "fixtures/unparseable.ts",
      "export function () {\n",
    );

    unsupportedCssFile = writeFixture(
      workspaceRoot,
      "fixtures/styles.css",
      ".fixture { color: red; }\n",
    );

    unsupportedJsonFile = writeFixture(
      workspaceRoot,
      "fixtures/data.json",
      '{"ok":true}\n',
    );

    invalidSourcePath = path.join(workspaceRoot, "fixtures", "not-a-file.ts");
    mkdirSync(invalidSourcePath, { recursive: true });
  });

  afterAll(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  test("enriches supported declarations, resolves relative and absolute paths, and leaves unsupported entries unchanged", async () => {
    const relativeExportsPath = path.relative(workspaceRoot, exportsFile);

    const entries: ManifestSymbolEntry[] = [
      createEntry("SYM-001", "myExportedFunc", relativeExportsPath),
      createEntry("SYM-002", "MyClass", exportsFile),
      createEntry("SYM-003", "MyInterface", relativeExportsPath),
      createEntry("SYM-004", "MyType", relativeExportsPath),
      createEntry("SYM-005", "MyEnum", relativeExportsPath),
      createEntry("SYM-006", "myConst", relativeExportsPath),
      createEntry("SYM-007", "missingSource"),
      createEntry(
        "SYM-008",
        "stylesheet",
        path.relative(workspaceRoot, unsupportedCssFile),
      ),
      createEntry(
        "SYM-009",
        "jsonBlob",
        path.relative(workspaceRoot, unsupportedJsonFile),
      ),
      createEntry("SYM-010", "MissingFile", "fixtures/does-not-exist.ts"),
    ];

    const results = await enrichSymbolCoordinatesWithTsMorph(
      entries,
      workspaceRoot,
    );
    const exportedFunction = requireEntry(results[0]);
    const exportedClass = requireEntry(results[1]);
    const exportedInterface = requireEntry(results[2]);
    const exportedType = requireEntry(results[3]);
    const exportedEnum = requireEntry(results[4]);
    const exportedConst = requireEntry(results[5]);
    const missingSource = requireEntry(results[6]);
    const unsupportedCss = requireEntry(results[7]);
    const unsupportedJson = requireEntry(results[8]);
    const missingFile = requireEntry(results[9]);

    expect(results).toHaveLength(entries.length);

    expectCoordinates(exportedFunction, 1);
    expect(exportedFunction.sourceColumn).toBe(16);

    expectCoordinates(exportedClass, 2);
    expectCoordinates(exportedInterface, 5);
    expectCoordinates(exportedType, 8);
    expectCoordinates(exportedEnum, 9);
    expectCoordinates(exportedConst, 10);

    expectUnchanged(missingSource, requireEntry(entries[6]));
    expectUnchanged(unsupportedCss, requireEntry(entries[7]));
    expectUnchanged(unsupportedJson, requireEntry(entries[8]));
    expectUnchanged(missingFile, requireEntry(entries[9]));
  });

  test("falls back to a unique non-exported top-level function when no exported declaration matches", async () => {
    const entry = createEntry(
      "SYM-011",
      "myInternalFunc",
      path.relative(workspaceRoot, internalFile),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectCoordinates(requireEntry(result), 1);
  });

  test("falls back to a unique class method when no top-level declaration matches", async () => {
    const entry = createEntry(
      "SYM-012",
      "myMethod",
      path.relative(workspaceRoot, methodsFile),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectCoordinates(requireEntry(result), 2);
  });

  test("falls back to unique class property and accessor symbols", async () => {
    const classMembersFile = path.join(
      workspaceRoot,
      "fixtures",
      "class-members.ts",
    );
    const propertyEntry = createEntry(
      "SYM-PROCESSING-LABEL",
      "processingProgressLabel",
      path.relative(workspaceRoot, classMembersFile),
    );
    const accessorEntry = createEntry(
      "SYM-PROCESSING-ARIA",
      "processingProgressAriaLabel",
      path.relative(workspaceRoot, classMembersFile),
    );

    const [propertyResult, accessorResult] =
      await enrichSymbolCoordinatesWithTsMorph(
        [propertyEntry, accessorEntry],
        workspaceRoot,
      );

    expectCoordinates(requireEntry(propertyResult), 2);
    expectCoordinates(requireEntry(accessorResult), 3);
  });

  test("resolves qualified class method, property, and accessor titles", async () => {
    const qualifiedMembersFile = writeFixture(
      workspaceRoot,
      "fixtures/qualified-members.ts",
      [
        "export class QualifiedHost {",
        "  runTask() { return 1; }",
        "  taskLabel = 'ready';",
        "  get taskStatus() { return this.taskLabel; }",
        "}",
      ].join("\n"),
    );
    const methodEntry = createEntry(
      "SYM-QUALIFIED-METHOD",
      "QualifiedHost.runTask",
      path.relative(workspaceRoot, qualifiedMembersFile),
    );
    const propertyEntry = createEntry(
      "SYM-QUALIFIED-PROPERTY",
      "QualifiedHost.taskLabel",
      path.relative(workspaceRoot, qualifiedMembersFile),
    );
    const accessorEntry = createEntry(
      "SYM-QUALIFIED-ACCESSOR",
      "QualifiedHost.taskStatus",
      path.relative(workspaceRoot, qualifiedMembersFile),
    );
    const missingEntry = createEntry(
      "SYM-QUALIFIED-MISSING",
      "QualifiedHost.missingMember",
      path.relative(workspaceRoot, qualifiedMembersFile),
    );

    const [methodResult, propertyResult, accessorResult, missingResult] =
      await enrichSymbolCoordinatesWithTsMorph(
        [methodEntry, propertyEntry, accessorEntry, missingEntry],
        workspaceRoot,
      );

    expectCoordinates(requireEntry(methodResult), 2);
    expectCoordinates(requireEntry(propertyResult), 3);
    expectCoordinates(requireEntry(accessorResult), 4);
    expectUnchanged(requireEntry(missingResult), missingEntry);
  });

  test("leaves ambiguous internal functions and class members unchanged", async () => {
    const ambiguousFile = writeFixture(
      workspaceRoot,
      "fixtures/ambiguous.ts",
      [
        "function duplicate() { return 1; }",
        "function duplicate() { return 2; }",
        "class First { sharedMember = 1; }",
        "class Second { sharedMember = 2; }",
      ].join("\n"),
    );
    const duplicateEntry = createEntry(
      "SYM-DUPLICATE",
      "duplicate",
      path.relative(workspaceRoot, ambiguousFile),
    );
    const sharedMemberEntry = createEntry(
      "SYM-SHARED-MEMBER",
      "sharedMember",
      path.relative(workspaceRoot, ambiguousFile),
    );

    const [duplicateResult, sharedMemberResult] =
      await enrichSymbolCoordinatesWithTsMorph(
        [duplicateEntry, sharedMemberEntry],
        workspaceRoot,
      );

    expectUnchanged(requireEntry(duplicateResult), duplicateEntry);
    expectUnchanged(requireEntry(sharedMemberResult), sharedMemberEntry);
  });

  test("returns the original entry when the symbol name does not exist in the source file", async () => {
    const entry = createEntry(
      "SYM-013",
      "DoesNotExist",
      path.relative(workspaceRoot, exportsFile),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectUnchanged(requireEntry(result), entry);
  });

  test("prefers the earliest exported declaration when multiple exported declarations share the same title", async () => {
    const entry = createEntry(
      "SYM-014",
      "SharedName",
      path.relative(workspaceRoot, multipleMatchesFile),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectCoordinates(requireEntry(result), 1);
  });

  test("returns the original entry when the resolved TypeScript path cannot be loaded by ts-morph", async () => {
    const entry = createEntry(
      "SYM-015",
      "BrokenTarget",
      path.relative(workspaceRoot, invalidSourcePath),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectUnchanged(requireEntry(result), entry);
  });

  test("returns the original entry for an unparseable TypeScript file", async () => {
    const entry = createEntry(
      "SYM-016",
      "BrokenSymbol",
      path.relative(workspaceRoot, unparseableFile),
    );

    const [result] = await enrichSymbolCoordinatesWithTsMorph(
      [entry],
      workspaceRoot,
    );

    expectUnchanged(requireEntry(result), entry);
  });

  test("analyzes JS/TS source text into reusable parser-backed symbol metadata", () => {
    const createTsMorphSourceAnalysisProvider = (
      symbolsTsExports as {
        createTsMorphSourceAnalysisProvider?: () => {
          analyzeText: (
            filePath: string,
            content: string,
          ) => {
            providerId: string;
            module: {
              title: string;
              language: string;
              analysisMode: string;
            };
            symbols: Array<{ name: string; kind: string }>;
          };
        };
      }
    ).createTsMorphSourceAnalysisProvider;

    expect(typeof createTsMorphSourceAnalysisProvider).toBe("function");
    const provider = createTsMorphSourceAnalysisProvider?.();
    if (!provider) {
      throw new Error("Expected ts-morph source analysis provider");
    }
    const analysis = provider.analyzeText(
      "fixtures/analyze.ts",
      [
        "export function parsedFunction() { return 1; }",
        "export class ParsedClass { parsedMethod() { return 2; } }",
        "export interface ParsedShape { ok: boolean }",
        "export type ParsedAlias = string;",
        "export enum ParsedMode { On }",
        "export const parsedValue = 42;",
      ].join("\n"),
    );

    expect(analysis.providerId).toBe("ts-morph");
    expect(analysis.module).toMatchObject({
      title: "analyze",
      language: "typescript",
      analysisMode: "parser",
    });
    expect(
      analysis.symbols.map((symbol: { name: string; kind: string }) => [
        symbol.name,
        symbol.kind,
      ]),
    ).toEqual([
      ["parsedFunction", "function"],
      ["ParsedClass", "class"],
      ["ParsedClass.parsedMethod", "method"],
      ["ParsedShape", "interface"],
      ["ParsedAlias", "type"],
      ["ParsedMode", "enum"],
      ["parsedValue", "variable"],
    ]);
  });

  test("analyzes class properties, accessors, JSX, and CTS inputs", () => {
    const createTsMorphSourceAnalysisProvider = (
      symbolsTsExports as {
        createTsMorphSourceAnalysisProvider?: () => {
          supportsFile: (filePath: string) => boolean;
          analyzeText: (
            filePath: string,
            content: string,
          ) => {
            language: string;
            module: { language: string };
            symbols: Array<{ name: string; kind: string }>;
          };
        };
      }
    ).createTsMorphSourceAnalysisProvider;

    expect(typeof createTsMorphSourceAnalysisProvider).toBe("function");
    const provider = createTsMorphSourceAnalysisProvider?.();
    if (!provider) {
      throw new Error("Expected ts-morph source analysis provider");
    }

    expect(provider.supportsFile("component.TSX")).toBe(true);
    expect(provider.supportsFile("styles.css")).toBe(false);

    const jsxAnalysis = provider.analyzeText(
      "fixtures/component.jsx",
      [
        "export class Widget {",
        "  value = 1;",
        "  get label() { return 'x'; }",
        "  set label(value) { void value; }",
        "}",
      ].join("\n"),
    );
    const ctsAnalysis = provider.analyzeText(
      "fixtures/module.cts",
      "export const ctsValue = 1;\n",
    );
    const cjsAnalysis = provider.analyzeText(
      "fixtures/common.cjs",
      "exports.commonValue = 1;\n",
    );

    expect(jsxAnalysis.language).toBe("javascript");
    expect(jsxAnalysis.module.language).toBe("javascript");
    expect(
      jsxAnalysis.symbols.map((symbol) => [symbol.name, symbol.kind]),
    ).toEqual([
      ["Widget", "class"],
      ["Widget.value", "property"],
      ["Widget.label", "accessor"],
      ["Widget.label", "accessor"],
    ]);
    expect(ctsAnalysis.language).toBe("typescript");
    expect(ctsAnalysis.symbols).toEqual([
      expect.objectContaining({ name: "ctsValue", kind: "variable" }),
    ]);
    expect(cjsAnalysis.language).toBe("javascript");
  });
});
