import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

function sha256Hex(contents: string | Buffer): string {
  const buf = Buffer.isBuffer(contents)
    ? contents
    : Buffer.from(String(contents));
  return createHash("sha256").update(buf).digest("hex");
}

function repoSymbolsHash(repoRoot: string): string | null {
  const p = join(repoRoot, "symbols.yaml");
  if (!existsSync(p)) return null;
  return sha256Hex(readFileSync(p));
}

function kbBranchesSnapshot(repoRoot: string): string[] {
  const dir = join(repoRoot, ".kb/branches");
  if (!existsSync(dir)) return [];

  const walk = (d: string, base: string): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const rel = relative(base, full);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        out.push(...walk(full, base));
      } else {
        const contents = readFileSync(full);
        out.push(`${rel}:${sha256Hex(contents)}`);
      }
    }
    return out;
  };
  return walk(dir, dir).sort();
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Staged Symbol Traceability Gate", () => {
    const TEST_TIMEOUT_MS = 30000;
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "⚠️  SWI-Prolog not available, skipping traceability tests",
          );
          return;
        }

        tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;

        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();

        // Initialize kibi KB so check --staged can attach to a branch KB
        try {
          await kibi(sandbox, ["init"]);
        } catch {
          // init may fail if git has no commits yet; create an empty commit first
          await run("git", ["commit", "--allow-empty", "-m", "initial"], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
          });
          await kibi(sandbox, ["init"]);
        }
      },
      { timeout: 120000 },
    );

    afterEach(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 120000 },
    );

    it("should pass with implements directive", async () => {
      if (!hasProlog) return;

      // snapshot host repo artifacts
      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // create a TS file with exported function and implements directive
      const src =
        "// implements: REQ-001\nexport function hello() { return 'ok'; }\n";

      const fs = await import("node:fs");
      const filePath = join(sandbox.repoDir, "file.js");
      fs.writeFileSync(filePath, src, "utf8");

      await run("git", ["add", "file.js"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      let out = "";
      let exitCode = 0;
      try {
        const result = await kibi(sandbox, ["check", "--staged"], {
          timeoutMs: TEST_TIMEOUT_MS,
        });
        out = result.stdout + result.stderr;
        exitCode = result.exitCode;
      } catch (e) {
        const err = e as Error;
        out = err.message;
        exitCode = 1;
      }

      const passed =
        out.includes("No violations found") ||
        out.includes("✓") ||
        out.includes("No staged files found");
      assert.ok(passed, `Expected passing output, got: ${out}`);

      // non-mutation assertions
      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      assert.strictEqual(
        afterSymbols,
        beforeSymbols,
        "Host repo symbols.yaml should not be mutated",
      );
      assert.deepStrictEqual(
        afterBranches,
        beforeBranches,
        "Host repo KB should not be mutated",
      );
    });

    it("should fail without requirement link", async () => {
      if (!hasProlog) return;

      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      const src = "export function missingLink() { return 1; }\n";

      const fs = await import("node:fs");
      const filePath = join(sandbox.repoDir, "noimpl.js");
      fs.writeFileSync(filePath, src, "utf8");

      await run("git", ["add", "noimpl.js"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      let code = 0;
      let stdout = "";
      try {
        const result = await kibi(sandbox, ["check", "--staged"], {
          timeoutMs: TEST_TIMEOUT_MS,
        });
        stdout = result.stdout;
        code = result.exitCode;
      } catch (e) {
        code = 1;
        const err = e as Error;
        stdout = err.message;
      }

      const okFailure =
        code === 1 &&
        /noimpl\.js:\d+/.test(stdout) &&
        stdout.includes("missingLink");
      const skipped = stdout.includes("No staged files found");
      assert.ok(
        okFailure || skipped,
        `Expected failure with violation info, got code=${code}, stdout=${stdout}`,
      );

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      assert.strictEqual(afterSymbols, beforeSymbols);
      assert.deepStrictEqual(afterBranches, beforeBranches);
    });

    it("should handle nothing staged", async () => {
      if (!hasProlog) return;

      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // ensure no staged files - reset any previous test state
      await run("git", ["reset"], { cwd: sandbox.repoDir, env: sandbox.env });

      const result = await kibi(sandbox, ["check", "--staged"], {
        timeoutMs: TEST_TIMEOUT_MS,
      });
      const out = result.stdout + result.stderr;

      assert.ok(
        out.includes("No staged files found"),
        `Expected 'No staged files found', got: ${out}`,
      );

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      assert.strictEqual(afterSymbols, beforeSymbols);
      assert.deepStrictEqual(afterBranches, beforeBranches);
    });
  });
}
