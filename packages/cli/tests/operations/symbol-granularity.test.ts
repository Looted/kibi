import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateSymbolGranularity } from "../../src/operations/mutation/symbol-granularity.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
} from "../../src/public/operations/runtime-types.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-granularity-"));
  tempDirs.push(dir);
  return dir;
}

function context(
  workspaceRoot: string,
  fs: FilesystemPort | undefined = nodeFilesystem,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    fs,
  };
}

const implementsRel = [{ type: "implements", from: "SYM-COARSE", to: "REQ-1" }];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("validateSymbolGranularity", () => {
  test("returns without checking when the entity is not a linked coarse symbol", async () => {
    const root = makeTempDir();
    await validateSymbolGranularity(
      { type: "req", id: "REQ-1", title: "n", sourceFile: "a.ts" },
      implementsRel,
      context(root),
    );
    await validateSymbolGranularity(
      { type: "symbol", id: "SYM-1", title: "n", sourceFile: "a.ts" },
      [{ type: "relates_to", from: "SYM-1", to: "REQ-1" }],
      context(root),
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-1",
        title: "n",
        sourceFile: "a.ts",
        granularity_reason: "module-level-behavior",
      },
      implementsRel,
      context(root),
    );
    await validateSymbolGranularity(
      { type: "symbol", id: "SYM-1", sourceFile: "a.ts" },
      implementsRel,
      context(root),
    );
    await validateSymbolGranularity(
      { type: "symbol", id: "SYM-1", title: "n", sourceFile: "a.ts" },
      implementsRel,
      context(root, undefined),
    );
  });

  test("accepts an exact behavioral match and an exported constant", async () => {
    const root = makeTempDir();
    const filePath = path.join(root, "exact.ts");
    writeFileSync(
      filePath,
      [
        "export function handleClick() {}",
        "export const FEATURE_FLAG = true;",
      ].join("\n"),
    );

    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-FN",
        title: "handleClick",
        sourceFile: "exact.ts",
      },
      implementsRel,
      context(root),
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-CFG",
        title: "FEATURE_FLAG",
        sourceFile: filePath,
        symbol_role: "config",
      },
      implementsRel,
      context(root),
    );
    // An exported constant without a role is as granular: a certificate
    // proof's domain_source is exactly such a declaration.
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-DOMAIN",
        title: "FEATURE_FLAG",
        sourceFile: "exact.ts",
      },
      implementsRel,
      context(root),
    );
  });

  test("ignores missing files, directories, and recoverable read errors", async () => {
    const root = makeTempDir();
    const dirPath = path.join(root, "not-a-file.ts");
    writeFileSync(path.join(root, "keep.txt"), "ok");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dirPath);

    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-MISSING",
        title: "gone",
        sourceFile: "missing.ts",
      },
      implementsRel,
      context(root),
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-DIR",
        title: "gone",
        sourceFile: "not-a-file.ts",
      },
      implementsRel,
      context(root),
    );

    const throwingFs: FilesystemPort = {
      readFile: async () => {
        throw new Error("read failed");
      },
      writeFile: async () => undefined,
      mkdir: async () => undefined,
      stat: async () => {
        throw new Error("stat failed");
      },
    };
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-ERR",
        title: "gone",
        sourceFile: "exact.ts",
      },
      implementsRel,
      context(root, throwingFs),
    );
  });

  test("rethrows non-Error filesystem failures", async () => {
    const root = makeTempDir();
    const throwingFs: FilesystemPort = {
      readFile: async () => {
        throw "raw-failure";
      },
      writeFile: async () => undefined,
      mkdir: async () => undefined,
      stat: async () => {
        throw "raw-failure";
      },
    };
    await expect(
      validateSymbolGranularity(
        {
          type: "symbol",
          id: "SYM-RAW",
          title: "gone",
          sourceFile: "exact.ts",
        },
        implementsRel,
        context(root, throwingFs),
      ),
    ).rejects.toBe("raw-failure");
  });

  test("accepts files that only expose non-behavioral symbols", async () => {
    const root = makeTempDir();
    writeFileSync(
      path.join(root, "types.ts"),
      [
        "export interface Shape {}",
        "export type Alias = string;",
        "export enum Kind { A }",
        "export const CONFIG = 1;",
      ].join("\n"),
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-TYPES",
        title: "module",
        sourceFile: "types.ts",
      },
      implementsRel,
      context(root),
    );
  });

  test("rejects coarse titles when granular behavioral symbols exist", async () => {
    const root = makeTempDir();
    writeFileSync(
      path.join(root, "coarse.ts"),
      [
        "export function alpha() {}",
        "export class Widget {",
        "  run() {}",
        "  private hidden() {}",
        "  #secret() {}",
        "  visible = 1;",
        "  private ignored = 2;",
        "  get ready() { return true; }",
        "  private get noop() { return false; }",
        "}",
        "export class Other { run() {} }",
        "export interface Shape {}",
        "export type Alias = string;",
        "export enum Kind { A }",
        "export const CONFIG = 1;",
      ].join("\n"),
    );

    await expect(
      validateSymbolGranularity(
        {
          type: "symbol",
          id: "SYM-COARSE",
          title: "module",
          sourceFile: "coarse.ts",
        },
        implementsRel,
        context(root),
      ),
    ).rejects.toThrow(/granular symbols are available/);
    // The exported constant itself is a declaration with exact coordinates,
    // as the staged gate and kibi check judge it: not a coarse file link.
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-CONFIG",
        title: "CONFIG",
        sourceFile: "coarse.ts",
      },
      implementsRel,
      context(root),
    );
  });

  test("accepts a bare unique method title from collectGranularityCandidates parity", async () => {
    const root = makeTempDir();
    writeFileSync(
      path.join(root, "widget.ts"),
      "export class Widget { public render() {} }\n",
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-RENDER",
        title: "render",
        sourceFile: "widget.ts",
      },
      implementsRel,
      context(root),
    );
  });

  test("rejects a class title whose public members are behavioral symbols", async () => {
    const root = makeTempDir();
    writeFileSync(
      path.join(root, "canvas.ts"),
      [
        "export class CanvasService {",
        "  draw() {}",
        "  clear() {}",
        "  private reset() {}",
        "}",
        "export class Empty {}",
      ].join("\n"),
    );
    await expect(
      validateSymbolGranularity(
        {
          type: "symbol",
          id: "SYM-CANVAS",
          title: "CanvasService",
          sourceFile: "canvas.ts",
        },
        implementsRel,
        context(root),
      ),
    ).rejects.toThrow(
      "Symbol SYM-CANVAS links canvas.ts coarsely while granular symbols are available (behavioral only): CanvasService.clear, CanvasService.draw.",
    );
    await validateSymbolGranularity(
      {
        type: "symbol",
        id: "SYM-EMPTY",
        title: "Empty",
        sourceFile: "canvas.ts",
      },
      implementsRel,
      context(root),
    );
  });

  test("judges a links-only update against the stored symbol", async () => {
    const root = makeTempDir();
    writeFileSync(
      path.join(root, "canvas.ts"),
      "export class CanvasService {\n  draw() {}\n}\n",
    );
    const linksOnly = {
      type: "symbol",
      id: "SYM-CANVAS",
      title: "CanvasService",
      status: "active",
    };
    // Without the stored symbol the payload names no file to judge.
    await validateSymbolGranularity(linksOnly, implementsRel, context(root));
    await expect(
      validateSymbolGranularity(
        linksOnly,
        implementsRel,
        context(root),
        async () => ({ id: "SYM-CANVAS", sourceFile: "canvas.ts" }),
      ),
    ).rejects.toThrow(/links canvas\.ts coarsely/);
    // A stored granularity_reason still applies to the update.
    await validateSymbolGranularity(
      linksOnly,
      implementsRel,
      context(root),
      async () => ({
        id: "SYM-CANVAS",
        sourceFile: "canvas.ts",
        granularity_reason: "module-level-behavior",
      }),
    );
    // Fields the payload sets win over the stored ones.
    await validateSymbolGranularity(
      { ...linksOnly, title: "CanvasService.draw" },
      implementsRel,
      context(root),
      async () => ({ id: "SYM-CANVAS", sourceFile: "canvas.ts" }),
    );
    // A payload with no traceability link never reads the stored symbol.
    await validateSymbolGranularity(linksOnly, [], context(root), async () => {
      throw new Error("stored symbol read");
    });
  });

  test("parses tsx, jsx, js, and extra TypeScript extensions and truncates long lists", async () => {
    const root = makeTempDir();
    const functions = Array.from(
      { length: 12 },
      (_, index) => `export function fn${index}() {}`,
    ).join("\n");
    for (const fileName of [
      "view.tsx",
      "view.jsx",
      "view.js",
      "view.mts",
      "view.cts",
    ]) {
      writeFileSync(path.join(root, fileName), functions);
      await expect(
        validateSymbolGranularity(
          {
            type: "symbol",
            id: `SYM-${fileName}`,
            title: "module",
            sourceFile: fileName,
          },
          implementsRel,
          context(root),
        ),
      ).rejects.toThrow(/and 2 more/);
    }
  });
});
