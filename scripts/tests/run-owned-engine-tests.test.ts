import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// executable_for TEST-test-journaled-engine-harness
describe("owned engine test runner", () => {
  test("provides a private runtime and cleans an exact owned PID", () => {
    const childScript = [
      "const { spawn } = require('node:child_process');",
      "const { writeFileSync } = require('node:fs');",
      "const { join } = require('node:path');",
      "const owned = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' });",
      "owned.unref();",
      "writeFileSync(join(process.env.KIBI_RUNTIME_DIR, 'fixture.pid'), String(owned.pid));",
      "process.stdout.write(JSON.stringify({ pid: owned.pid, runtime: process.env.KIBI_RUNTIME_DIR }) + '\\n');",
    ].join("\n");
    const output = execFileSync(
      process.execPath,
      [
        resolve("scripts/run-owned-engine-tests.mjs"),
        "--",
        process.execPath,
        "-e",
        childScript,
      ],
      { cwd: resolve("."), encoding: "utf8" },
    );
    const firstLine = output.split("\n", 1)[0];
    const parsed = JSON.parse(firstLine ?? "{}") as {
      pid: number;
      runtime: string;
    };
    expect(existsSync(parsed.runtime)).toBe(false);
    expect(() => process.kill(parsed.pid, 0)).toThrow();
  });
});
