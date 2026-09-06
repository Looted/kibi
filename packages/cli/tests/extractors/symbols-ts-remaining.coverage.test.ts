// implements REQ-001
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fsPromises from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";
import {
  createTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph,
} from "../../src/extractors/symbols-ts.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

describe("symbols-ts leftover script kinds, fallback, and fail-closed matches", () => {
  test("analyzes cts/cjs and anonymous class members", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const provider = createTsMorphSourceAnalysisProvider();
    expect(provider.supportsFile("src/a.cts")).toBe(true);
    expect(provider.supportsFile("src/a.cjs")).toBe(true);
    const cts = provider.analyzeText("src/mod.cts", "export function ctsFn() {}");
    expect(cts.language).toBe("typescript");
    const cjs = provider.analyzeText("src/mod.cjs", "export function cjsFn() {}");
    expect(cjs.language).toBe("javascript");
    const anon = provider.analyzeText(
      "src/anon.ts",
      "export default class { run() {} get label() { return 1 } }",
    );
    expect(anon.symbols.some((symbol) => symbol.name === "run")).toBe(true);
  });

  test("reuses a parsed source file and falls back when addSourceFileAtPath throws", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-symbols-fb-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "widget.ts"), "export function exportedFn() {}\n");
    const add = spyOn(Project.prototype, "addSourceFileAtPath").mockImplementation(
      () => {
        throw new Error("parse denied");
      },
    );
    restores.push(() => add.mockRestore());
    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [
        { id: "SYM-1", title: "exportedFn", sourceFile: "src/widget.ts" },
        { id: "SYM-2", title: "exportedFn", sourceFile: "src/widget.ts" },
      ],
      root,
    );
    expect(enriched[0]?.sourceLine).toBe(1);
    expect(enriched[1]?.sourceLine).toBe(1);
  });

  test("fail-closes duplicate internal functions and methods, and matches regex titles", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-symbols-dup-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "dup.ts"),
      `
function dupFn() {}
function dupFn() {}
export class One { run() {} }
export class Two { run() {} }
export function special$name() {}
`,
    );
    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [
        { id: "SYM-DUP", title: "dupFn", sourceFile: "src/dup.ts" },
        { id: "SYM-RUN", title: "run", sourceFile: "src/dup.ts" },
        { id: "SYM-SPEC", title: "special$name", sourceFile: "src/dup.ts" },
        { id: "SYM-DOT", title: "One.", sourceFile: "src/dup.ts" },
        { id: "SYM-LEAD", title: ".run", sourceFile: "src/dup.ts" },
      ],
      root,
    );
    expect(enriched.find((row) => row.id === "SYM-DUP")?.sourceLine).toBeUndefined();
    expect(enriched.find((row) => row.id === "SYM-RUN")?.sourceLine).toBeUndefined();
    expect(enriched.find((row) => row.id === "SYM-SPEC")?.sourceLine).toBeDefined();
    expect(enriched.find((row) => row.id === "SYM-DOT")?.sourceLine).toBeUndefined();
  });

  test("warns and falls back when coordinate enrichment throws", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-symbols-throw-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "widget.ts"), "export function exportedFn() {}\n");
    const io = {
      warns: [] as string[],
    };
    const warn = spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      io.warns.push(String(args[0]));
    });
    restores.push(() => warn.mockRestore());
    const line = spyOn(Project.prototype, "addSourceFileAtPath").mockImplementation(
      function (this: Project, filePath: string) {
        const sf = Project.prototype.createSourceFile.call(
          this,
          filePath,
          "export function exportedFn() {}",
          { overwrite: true },
        );
        spyOn(sf, "getLineAndColumnAtPos").mockImplementation(() => {
          throw new Error("span denied");
        });
        return sf;
      },
    );
    restores.push(() => line.mockRestore());
    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [{ id: "SYM-1", title: "exportedFn", sourceFile: "src/widget.ts" }],
      root,
    );
    expect(io.warns.join("\n")).toMatch(/Failed to enrich symbol coordinates/);
    expect(enriched[0]?.id).toBe("SYM-1");
  });

  test("keeps the original entry when catch-path source resolution fails", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-symbols-gone-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "widget.ts"),
      "export function exportedFn() {}\n",
    );
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    restores.push(() => warn.mockRestore());
    let accessCalls = 0;
    const access = spyOn(fsPromises, "access").mockImplementation(async () => {
      accessCalls += 1;
      if (accessCalls >= 2) throw new Error("vanished");
    });
    restores.push(() => access.mockRestore());
    const line = spyOn(Project.prototype, "addSourceFileAtPath").mockImplementation(
      function (this: Project, filePath: string) {
        const sf = Project.prototype.createSourceFile.call(
          this,
          filePath,
          "export function exportedFn() {}",
          { overwrite: true },
        );
        spyOn(sf, "getLineAndColumnAtPos").mockImplementation(() => {
          throw new Error("span denied");
        });
        return sf;
      },
    );
    restores.push(() => line.mockRestore());
    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [{ id: "SYM-1", title: "exportedFn", sourceFile: "src/widget.ts" }],
      root,
    );
    expect(enriched[0]).toEqual({
      id: "SYM-1",
      title: "exportedFn",
      sourceFile: "src/widget.ts",
    });
  });

  test("returns the original entry when text fallback cannot match the title", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-symbols-nomatch-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "widget.ts"),
      "export function exportedFn() {}\n",
    );
    const add = spyOn(Project.prototype, "addSourceFileAtPath").mockImplementation(
      () => {
        throw new Error("parse denied");
      },
    );
    restores.push(() => add.mockRestore());
    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [{ id: "SYM-MISS", title: "noSuchTokenXYZ", sourceFile: "src/widget.ts" }],
      root,
    );
    expect(enriched[0]?.title).toBe("noSuchTokenXYZ");
    expect(enriched[0]?.sourceLine).toBeUndefined();
  });
});
