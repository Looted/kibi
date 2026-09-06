// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { runUnitCoverage, runUnitCoverageIfMain } from "../run-unit-coverage.ts";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

function lcovRecord(file: string, hit: number): string {
  return [
    "TN:",
    `SF:${file}`,
    `DA:1,${hit}`,
    "LF:1",
    `LH:${hit > 0 ? 1 : 0}`,
    "end_of_record",
    "",
  ].join("\n");
}

describe("runUnitCoverage mocked shards", () => {
  test("merges shard LCOV, records failures, and warns about missing sources", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    const previousCwd = process.cwd();
    const previousExit = process.exitCode;
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(
      ((_command, args) => {
        const list = (args ?? []) as string[];
        const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
        const selected = list.find((value) => value.startsWith("./")) ?? "";
        mkdirSync(coverageDir, { recursive: true });
        if (selected.includes("runtime")) {
          return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
        }
        if (selected.includes("vscode")) {
          mkdirSync(path.join(root, "coverage", "unit"), { recursive: true });
          writeFileSync(
            path.join(root, "coverage", "unit", "lcov.info"),
            lcovRecord("packages/demo/src/fallback.ts", 0),
          );
          return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
        }
        writeFileSync(
          path.join(coverageDir, "lcov.info"),
          lcovRecord("packages/demo/src/main.ts", selected.includes("skillopt") ? 0 : 1),
        );
        return {
          status: selected.includes("skillopt") ? 1 : 0,
        } as ReturnType<typeof childProcess.spawnSync>;
      }) as typeof childProcess.spawnSync,
    );
    process.chdir(root);
    try {
      await runUnitCoverage();
      const merged = readFileSync(
        path.join(root, "coverage", "unit", "lcov.info"),
        "utf8",
      );
      expect(merged).toContain("SF:packages/demo/src/main.ts");
      const failed = readFileSync(
        path.join(root, "coverage", "unit", "failed-shards.txt"),
        "utf8",
      );
      expect(failed).toContain("skillopt");
      expect(failed).toContain("coverage artifact missing");
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExit ?? 0;
      spawnSpy.mockRestore();
    }
  }, 20_000);

  test("fails the coverage floor, warns about missing sources, and honors the main guard", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-floor-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    writeFileSync(path.join(root, "packages", "demo", "src", "other.ts"), "y\n");
    const previousCwd = process.cwd();
    const previousExit = process.exitCode;
    const errors: string[] = [];
    const warnings: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const warnSpy = spyOn(console, "warn").mockImplementation((message) => {
      warnings.push(String(message));
    });
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(
      ((_command, args) => {
        const list = (args ?? []) as string[];
        const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
        mkdirSync(coverageDir, { recursive: true });
        writeFileSync(
          path.join(coverageDir, "lcov.info"),
          lcovRecord("packages/demo/src/main.ts", 0),
        );
        return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
      }) as typeof childProcess.spawnSync,
    );
    process.chdir(root);
    try {
      await runUnitCoverageIfMain(false);
      expect(spawnSpy).not.toHaveBeenCalled();
      await runUnitCoverageIfMain(true);
      expect(errors.join("\n")).toMatch(/below the 50% floor/);
      expect(warnings.join("\n")).toMatch(/absent from LCOV/);
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExit ?? 0;
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 20_000);
});
