import assert from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
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

        // Initialize kibi KB and create an explicit HEAD commit so staged-file
        // checks run deterministically across git environments.
        await kibi(sandbox, ["init"]);
        await run("git", ["commit", "--allow-empty", "-m", "initial"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        createMarkdownFile(
          sandbox,
          "documentation/requirements/REQ-001.md",
          {
            id: "REQ-001",
            title: "Traceability baseline requirement",
            status: "open",
            created_at: "2026-03-20T17:30:00Z",
            updated_at: "2026-03-20T17:30:00Z",
            source: "documentation/requirements/REQ-001.md",
          },
          "Requirement seeded so staged traceability checks can resolve REQ-001.",
        );

        await kibi(sandbox, ["sync"], { timeoutMs: TEST_TIMEOUT_MS });
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

    it("should pass with authored symbol ownership metadata", async () => {
      if (!hasProlog) return;

      // snapshot host repo artifacts
      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // Create a source file plus authored symbol metadata that links ownership
      // to REQ-001. Inline implements comments alone are legacy-compatible for
      // parsing, but staged checks require durable symbol evidence.
      const src = "export function hello() { return 'ok'; }\n";

      const fs = await import("node:fs");
      const filePath = join(sandbox.repoDir, "file.js");
      fs.writeFileSync(filePath, src, "utf8");

      const symbolsYaml = `symbols:
  - id: SYM-HELLO-001
    title: hello
    sourceFile: file.js
    links:
      - type: implements
        target: REQ-001
    status: active
`;
      fs.writeFileSync(
        join(sandbox.repoDir, "documentation", "symbols.yaml"),
        symbolsYaml,
        "utf8",
      );

      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: TEST_TIMEOUT_MS,
      });

      await run(
        "git",
        [
          "add",
          "file.js",
          "documentation/symbols.yaml",
          "documentation/symbol-coordinates.yaml",
        ],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        },
      );

      let out = "";
      try {
        const result = await kibi(sandbox, ["check", "--staged"], {
          timeoutMs: TEST_TIMEOUT_MS,
        });
        out = result.stdout + result.stderr;
      } catch (e) {
        const err = e as Error;
        out = err.message;
      }

      // "No staged files found" is NOT a passing outcome — it means git staging
      // silently failed and the traceability check never ran. Only accept a
      // genuine clean-check result.
      const passed = out.includes("No violations found") || out.includes("✓");
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
      assert.ok(
        okFailure,
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

    it("should pass with executable_for test symbol", async () => {
      if (!hasProlog) return;

      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // Create test entity and symbol manifest with executable_for
      createMarkdownFile(
        sandbox,
        "documentation/tests/TEST-EXE-001.md",
        {
          id: "TEST-EXE-001",
          title: "Executable test",
          status: "passing",
          created_at: "2026-03-20T17:30:00Z",
          updated_at: "2026-03-20T17:30:00Z",
          source: "documentation/tests/TEST-EXE-001.md",
        },
        "Test for executable_for check.",
      );

      const fs = await import("node:fs");
      const symbolsYaml = `symbols:
  - id: SYM-EXE-001
    title: testHelper
    sourceFile: tests/helper.js
    links:
      - type: executable_for
        target: TEST-EXE-001
    status: active
`;
      fs.writeFileSync(
        join(sandbox.repoDir, "documentation", "symbols.yaml"),
        symbolsYaml,
        "utf8",
      );

      fs.mkdirSync(join(sandbox.repoDir, "tests"), { recursive: true });
      const src = "export function testHelper() { return 'ok'; }\n";
      fs.writeFileSync(
        join(sandbox.repoDir, "tests", "helper.js"),
        src,
        "utf8",
      );
      fs.writeFileSync(
        join(sandbox.repoDir, "tests", "helper.js"),
        src,
        "utf8",
      );

      await run("git", ["add", "."], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });

      let out = "";
      try {
        const result = await kibi(sandbox, ["check", "--staged"], {
          timeoutMs: TEST_TIMEOUT_MS,
        });
        out = result.stdout + result.stderr;
      } catch (e) {
        const err = e as Error;
        out = err.message;
      }

      const passed =
        out.includes("No violations found") || out.includes("\u2713");
      assert.ok(
        passed,
        `Expected passing output for executable_for symbol, got: ${out}`,
      );

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      assert.strictEqual(afterSymbols, beforeSymbols);
      assert.deepStrictEqual(afterBranches, beforeBranches);
    });

    it("should fail when only covered_by is present (no implements ownership)", async () => {
      if (!hasProlog) return;

      const hostRepo = process.cwd();
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // Create test that validates REQ-001 (direct write for typed links)
      const fs = await import("node:fs");
      const testContent = `---
id: TEST-COV-001
title: Coverage test
status: passing
created_at: 2026-03-20T17:30:00Z
updated_at: 2026-03-20T17:30:00Z
source: documentation/tests/TEST-COV-001.md
links:
  - type: validates
    target: REQ-001
---

Coverage test for split semantics.
`;
      fs.mkdirSync(join(sandbox.repoDir, "documentation", "tests"), {
        recursive: true,
      });
      fs.writeFileSync(
        join(sandbox.repoDir, "documentation", "tests", "TEST-COV-001.md"),
        testContent,
        "utf8",
      );

      const symbolsYaml = `symbols:
  - id: SYM-COV-001
    title: covFunc
    sourceFile: src/cov.js
    links:
      - type: covered_by
        target: TEST-COV-001
    status: active
`;
      fs.writeFileSync(
        join(sandbox.repoDir, "documentation", "symbols.yaml"),
        symbolsYaml,
        "utf8",
      );

      const src = "export function covFunc() { return 'cov'; }\n";
      fs.mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
      fs.writeFileSync(join(sandbox.repoDir, "src", "cov.js"), src, "utf8");
      fs.writeFileSync(join(sandbox.repoDir, "src", "cov.js"), src, "utf8");

      await run("git", ["add", "."], {
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

      // covered_by alone must fail the ownership gate
      const okFailure =
        code === 1 && /cov\.js:\d+/.test(stdout) && stdout.includes("covFunc");
      assert.ok(
        okFailure,
        `Expected failure with violation info, got code=${code}, stdout=${stdout}`,
      );

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      assert.strictEqual(afterSymbols, beforeSymbols);
      assert.deepStrictEqual(afterBranches, beforeBranches);
    });
  });
}
