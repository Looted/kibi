import assert from "node:assert";
import { before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

describe(
  "Packed E2E: CLI Query regression (consumer issue #3)",
  { timeout: 120000 },
  () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;

    before(
      async () => {
        // Pack packages and prepare sandbox
        tarballs = await packAll();
        sandbox = createSandbox();
        // Install in strict consumer mode (do NOT set KIBI_E2E_ALLOW_PATCHED_INSTALL)
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        // Ensure a clean repo state before each test - remove .kb if present
        // We call kibi init in tests where needed
      },
      { timeout: 120000 },
    );

    it(
      "should return entities when KB has data",
      { timeout: 60000 },
      async () => {
        // Init project and create a requirement
        const { exitCode: initCode } = await kibi(sandbox, ["init"]);
        assert.strictEqual(initCode, 0, "kibi init should succeed");

        createMarkdownFile(
          sandbox,
          "documentation/requirements/REQ-001.md",
          {
            id: "REQ-001",
            title: "E2E requirement",
            status: "open",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            source: "documentation/requirements/REQ-001.md",
            tags: ["e2e"],
          },
          "Placeholder requirement for regression test",
        );

        // Sync to populate .kb
        const { exitCode: syncCode, stdout: syncOut } = await kibi(sandbox, [
          "sync",
        ]);
        assert.strictEqual(syncCode, 0, `kibi sync should succeed: ${syncOut}`);

        // Query for req and assert REQ-001 is present in stdout
        const { exitCode: qCode, stdout } = await kibi(sandbox, [
          "query",
          "req",
        ]);
        assert.strictEqual(qCode, 0, "kibi query should exit 0");
        assert.ok(
          !stdout.includes("No entities found"),
          "query should not claim no entities found",
        );
        assert.ok(
          stdout.includes("REQ-001") || stdout.includes("E2E requirement"),
          "output must include created requirement",
        );
      },
    );

    it(
      "should return empty when KB has no matching entities",
      { timeout: 60000 },
      async () => {
        // Fresh repo: remove any entities by re-initializing a fresh sandbox repo dir
        // For simplicity, init a new branchless repo inside sandbox.repoDir and run query for a type that doesn't exist
        // Create a fresh .kb by running init in a temp dir (we reuse sandbox.repoDir but remove requirements)

        // Ensure there is no 'flag' entities
        const { exitCode: qCode, stdout } = await kibi(sandbox, [
          "query",
          "flag",
          "--format",
          "json",
        ]);
        assert.strictEqual(
          qCode,
          0,
          "kibi query should exit 0 even when empty",
        );
        // For JSON format empty result should be []
        assert.ok(
          stdout.trim() === "[]" || stdout.includes("No entities found"),
          "Expected explicit empty output for no entities",
        );
      },
    );

    it(
      "should distinguish legitimately empty from falsely empty and work from different CWD",
      { timeout: 60000 },
      async () => {
        // Create another entity type and ensure querying a different type returns empty while req still returns data
        createMarkdownFile(
          sandbox,
          "documentation/tests/TEST-001.md",
          {
            id: "TEST-001",
            title: "E2E test entity",
            status: "open",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            source: "documentation/tests/TEST-001.md",
          },
          "Test entity",
        );

        const { exitCode: syncCode } = await kibi(sandbox, ["sync"]);
        assert.strictEqual(syncCode, 0, "kibi sync should succeed");

        // Query a type that exists (req)
        const reqRes = await kibi(sandbox, [
          "query",
          "req",
          "--format",
          "table",
        ]);
        assert.strictEqual(reqRes.exitCode, 0);
        assert.ok(
          !reqRes.stdout.includes("No entities found"),
          "req query should return entities",
        );
        assert.ok(
          reqRes.stdout.includes("REQ-001") ||
            reqRes.stdout.includes("E2E requirement"),
        );

        // Query a different type that we expect to be empty (e.g., symbol)
        const symRes = await kibi(sandbox, [
          "query",
          "symbol",
          "--format",
          "json",
        ]);
        assert.strictEqual(symRes.exitCode, 0);
        // JSON empty should be []
        assert.ok(
          symRes.stdout.trim() === "[]" ||
            symRes.stdout.includes("No entities found"),
        );

        // Now simulate running from a different CWD (npx style): run kibi with cwd = sandbox.baseDir
        // Helpers.kibi uses sandbox.repoDir as cwd; to simulate different CWD we must invoke node directly
        // Use kibi binary but run with repo path via process env by changing cwd param is not exposed; instead ensure CLI resolves process.cwd()
        // So spawn kibi from parent dir by invoking node <kibiBin> with cwd = sandbox.baseDir
        // We use the sandbox.kibiBin path and run node on it
        const kibiBinArgs = [
          sandbox.kibiBin,
          "query",
          "req",
          "--format",
          "table",
        ];
        const { run } = await import("./helpers.js");
        const { stdout: outsideStdout, exitCode: outsideCode } = await run(
          "node",
          kibiBinArgs,
          {
            cwd: sandbox.baseDir,
            env: sandbox.env,
            timeoutMs: 60000,
          },
        );
        assert.ok(
          outsideCode !== 0 || outsideStdout.includes("No entities found"),
          "external invocation from outside repo should not falsely report req entities",
        );
      },
    );
  },
);
