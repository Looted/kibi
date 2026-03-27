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

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinatesWithTsMorph,
} from "../../src/extractors/symbols-ts";

// implements REQ-SYMBOL-MATCHER-001

describe("symbols-ts matcher guardrails", () => {
  let tmpDir: string;
  let sourceFilePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbols-ts-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * exportedWinsOverInternal
   *
   * When a source file has both an exported function named `foo` and an
   * internal (non-exported) function named `foo`, the matcher MUST resolve
   * to the exported declaration's coordinates, not the internal one.
   *
   * This guards against accidental resolution of the wrong symbol when both
   * exported and internal declarations share the same name.
   *
   * RED PHASE: The current implementation only scans exported declarations.
   * When an internal-then-exported pair exists, if the scanner is ever
   * extended to look at internals first, this test locks the priority rule.
   * Additionally this test verifies that coordinates are generated AND that
   * they point to the exported symbol's line, not the internal one.
   */
  test("exportedWinsOverInternal: exported declaration coordinates are returned when both exported and internal exist", async () => {
    // Internal `foo` is on line 3; exported `foo` is on line 5
    const source = [
      "// source file with both exported and internal foo",
      "",
      "function foo() { return 'internal'; }",
      "",
      "export function foo() { return 'exported'; }",
    ].join("\n");

    sourceFilePath = path.join(tmpDir, "dual-foo.ts");
    fs.writeFileSync(sourceFilePath, source, "utf8");

    const entry: ManifestSymbolEntry = {
      id: "SYM-foo",
      title: "foo",
      sourceFile: sourceFilePath,
    };

    const [result] = await enrichSymbolCoordinatesWithTsMorph([entry], tmpDir);

    // Coordinates must be generated
    expect(result.coordinatesGeneratedAt).toBeDefined();

    // The exported `foo` is on line 5 (1-based)
    // The internal `foo` is on line 3 (1-based)
    // We assert the matcher resolved to the EXPORTED declaration (line 5)
    expect(result.sourceLine).toBe(5);
  });

  /**
   * ambiguousInternalTitlesFailClosed
   *
   * When a source file has two non-exported functions with the same name
   * `bar`, the matcher MUST return no coordinates (fail closed).  Resolving
   * ambiguously to one of them would produce silently wrong coordinates.
   *
   * RED PHASE: The current scanner ignores non-exported declarations, so it
   * returns nothing today.  This test locks that behaviour so that if the
   * scanner is later extended to consider internal declarations, it must also
   * implement the fail-closed rule before coordinates are emitted.
   */
  test("ambiguousInternalTitlesFailClosed: no coordinates generated when title is ambiguous among internal declarations", async () => {
    const source = [
      "// two non-exported `bar` functions — ambiguous",
      "",
      "function bar() { return 1; }",
      "",
      "function bar() { return 2; }",
    ].join("\n");

    sourceFilePath = path.join(tmpDir, "ambiguous-bar.ts");
    fs.writeFileSync(sourceFilePath, source, "utf8");

    const entry: ManifestSymbolEntry = {
      id: "SYM-bar",
      title: "bar",
      sourceFile: sourceFilePath,
    };

    const [result] = await enrichSymbolCoordinatesWithTsMorph([entry], tmpDir);

    // No coordinates must be generated — fail closed on ambiguity
    expect(result.coordinatesGeneratedAt).toBeUndefined();
    expect(result.sourceLine).toBeUndefined();
  });

  /**
   * unsupportedShapesOutOfScope
   *
   * Getter accessors (`get baz() {}`) are NOT supported by the matcher.
   * The matcher MUST return no coordinates for getter declarations.
   *
   * Rationale: ts-morph `getAccessors` are class-member constructs and have
   * no standard top-level `isExported()` path.  Rather than silently produce
   * wrong coordinates, we keep getters out-of-scope until explicit support
   * is added and tested.
   *
   * RED PHASE: This test verifies fail-closed behaviour for an unsupported
   * shape.  If getter support is ever added, this test must be updated first.
   */
  test("unsupportedShapesOutOfScope: no coordinates generated for getter accessor declarations", async () => {
    const source = [
      "// a class with a getter named baz",
      "class MyClass {",
      "  get baz(): string { return 'value'; }",
      "}",
      "",
      "// also a top-level getter (object literal shorthand is not a declaration)",
      "const obj = { get baz() { return 42; } };",
    ].join("\n");

    sourceFilePath = path.join(tmpDir, "getter-baz.ts");
    fs.writeFileSync(sourceFilePath, source, "utf8");

    const entry: ManifestSymbolEntry = {
      id: "SYM-baz",
      title: "baz",
      sourceFile: sourceFilePath,
    };

    const [result] = await enrichSymbolCoordinatesWithTsMorph([entry], tmpDir);

    // No coordinates: getters are out-of-scope and must not be resolved
    expect(result.coordinatesGeneratedAt).toBeUndefined();
    expect(result.sourceLine).toBeUndefined();
  });
});
