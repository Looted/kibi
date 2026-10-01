import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

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

  test.skipIf(process.platform !== "linux" && process.platform !== "darwin")(
    "stops an actual engine in its owned socket directory under a long aliased TMPDIR",
    () => {
      const root = mkdtempSync("/tmp/kibi-harness-");
      const physical = realpathSync.native(root);
      const temporary = join(physical, "t".repeat(120));
      const alias = join(physical, "temp-alias");
      const workspace = join(physical, "workspace");
      mkdirSync(temporary);
      mkdirSync(workspace);
      symlinkSync(temporary, alias, "dir");
      expect(
        Buffer.byteLength(
          join(
            realpathSync.native(alias),
            "kibi-test-engine-runtime-XXXXXX",
            `kibi-${"0".repeat(32)}.sock`,
          ),
          "utf8",
        ),
      ).toBeGreaterThan(107);
      const environment = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
      environment.TMPDIR = alias;
      let parsed: { pid: number; runtime: string; socket: string } | undefined;
      try {
        const childScript = `
          import { EngineClient, engineSocketPath } from ${JSON.stringify(resolve("packages/cli/src/engine.ts"))};
          const client = new EngineClient({ workspaceRoot: ${JSON.stringify(workspace)}, branch: "main", timeout: 10000 });
          try {
            await client.start();
            await client.query("true");
            console.log(JSON.stringify({ pid: client.getPid(), runtime: process.env.KIBI_RUNTIME_DIR, socket: engineSocketPath(${JSON.stringify(workspace)}, "main") }));
          } finally {
            await client.terminate();
          }
        `;
        const output = execFileSync(
          process.execPath,
          [
            resolve("scripts/run-owned-engine-tests.mjs"),
            "--",
            process.execPath,
            "-e",
            childScript,
          ],
          {
            cwd: resolve("."),
            env: environment,
            encoding: "utf8",
            timeout: 20000,
          },
        );
        parsed = JSON.parse(output.split("\n", 1)[0] ?? "{}") as typeof parsed;
        if (parsed === undefined)
          throw new Error("Expected an actual engine receipt");
        expect(parsed.pid).toBeGreaterThan(1);
        expect(dirname(parsed.socket)).toBe(
          join(
            realpathSync.native("/tmp"),
            parsed.runtime.split("/").at(-1) ?? "",
          ),
        );
        expect(Buffer.byteLength(parsed.socket, "utf8")).toBeLessThanOrEqual(
          103,
        );
        expect(existsSync(parsed.runtime)).toBe(false);
        expect(existsSync(parsed.socket)).toBe(false);
        expect(output).toContain("Stopped 1 test engine.");
        expect(() => process.kill(parsed.pid, 0)).toThrow();
      } finally {
        if (parsed !== undefined) {
          try {
            process.kill(parsed.pid, "SIGTERM");
          } catch {
            /* The owned runner already stopped it. */
          }
          rmSync(parsed.runtime, { recursive: true, force: true });
        }
        rmSync(root, { recursive: true, force: true });
      }
    },
    25000,
  );
});
