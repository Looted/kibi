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
import { runUnitCoverage } from "../run-unit-coverage.ts";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

function lcovRecord(file: string, found: number, hit: number): string {
  const lines = Array.from(
    { length: found },
    (_, index) => `DA:${index + 1},${index < hit ? 1 : 0}`,
  );
  return [
    "TN:",
    `SF:${file}`,
    ...lines,
    `LF:${found}`,
    `LH:${hit}`,
    "end_of_record",
    "",
  ].join("\n");
}

describe("runUnitCoverage remaining floor and missing-source branches", () => {
  test("sets exitCode when coverage is below the floor and warns about missing sources", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-remain-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    writeFileSync(path.join(root, "packages", "demo", "src", "other.ts"), "y\n");
    const previousCwd = process.cwd();
    const previousExit = process.exitCode;
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(
      ((_command, args) => {
        const list = (args ?? []) as string[];
        const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
        mkdirSync(coverageDir, { recursive: true });
        writeFileSync(
          path.join(coverageDir, "lcov.info"),
          lcovRecord("packages/demo/src/main.ts", 100, 1),
        );
        return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
      }) as typeof childProcess.spawnSync,
    );
    spies.push(spawnSpy);
    process.chdir(root);
    try {
      await runUnitCoverage();
      const merged = readFileSync(
        path.join(root, "coverage", "unit", "lcov.info"),
        "utf8",
      );
      expect(merged).toContain("SF:packages/demo/src/main.ts");
      const missing = readFileSync(
        path.join(root, "coverage", "unit", "missing-source-files.txt"),
        "utf8",
      );
      expect(missing).toContain("packages/demo/src/other.ts");
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExit ?? 0;
    }
  }, 20_000);
});
