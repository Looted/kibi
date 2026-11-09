import assert from "node:assert";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type TestSandbox,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";
import { mcpToolPayload, startMcpStdioServer } from "./mcp-stdio-client.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

// The system-runtime job sets this on hosts with no bundled build (native
// Windows) after installing SWI-Prolog from its own installer.
const REQUIRED = process.env.KIBI_PACKED_REQUIRE_SYSTEM_SWIPL === "1";

function swiplOnPath(env: NodeJS.ProcessEnv): string | undefined {
  for (const dir of (env.PATH ?? env.Path ?? "").split(delimiter)) {
    if (dir === "") continue;
    for (const name of ["swipl", "swipl.exe"]) {
      if (existsSync(join(dir, name))) return join(dir, name);
    }
  }
  return undefined;
}

interface DoctorCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: { source?: string; path?: string; version?: string };
}

/**
 * E2E: the packed tarballs run Kibi on a host that has no bundled
 * SWI-Prolog and uses the swipl on PATH, as the install guide documents for
 * native Windows.
 *
 * REQ-prolog-bundled-release — where no kibi-swipl-<platform> package covers
 * the host, init, sync, check, doctor and the MCP server use the system
 * SWI-Prolog found on PATH.
 */
if (RUN_NODE_TEST_SUITE && REQUIRED) {
  describe("E2E: system SWI-Prolog where no bundle exists", () => {
    let sandbox: TestSandbox;

    before(
      async () => {
        const tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 600000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it("finds swipl on PATH", () => {
      assert.ok(
        swiplOnPath(sandbox.env),
        "this job needs a system SWI-Prolog on PATH",
      );
    });

    it("kibi doctor reports the system runtime", async () => {
      const result = await kibi(sandbox, ["doctor", "--format", "json"]);
      const report = JSON.parse(result.stdout) as { checks: DoctorCheck[] };
      const check = report.checks.find((entry) => entry.name === "SWI-Prolog");
      assert.ok(
        check,
        `doctor must report a SWI-Prolog check: ${result.stdout}`,
      );
      assert.strictEqual(check.passed, true, check.message);
      // No kibi-swipl-<platform> package covers native Windows, so the
      // runtime there must be the one on PATH.
      if (process.platform === "win32") {
        assert.strictEqual(check.details?.source, "path");
      }
    });

    it("kibi init, sync, check and query succeed on the system runtime", async () => {
      const init = await kibi(sandbox, ["init"]);
      assert.strictEqual(init.exitCode, 0, `${init.stdout}${init.stderr}`);
      mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
        recursive: true,
      });
      writeFileSync(
        join(sandbox.repoDir, ".kb", "requirements", "REQ-SYSTEM-SMOKE.md"),
        `---
id: REQ-SYSTEM-SMOKE
title: System runtime smoke requirement
status: open
required_evidence: asserted
---

The system runtime compiles this requirement.

## Context

This requirement exists only so the packed smoke test has one authored entity to sync, check and query through a system SWI-Prolog on a host with no bundled build.
`,
      );
      stageSourceFile(sandbox, ".kb/requirements/REQ-SYSTEM-SMOKE.md");
      const sync = await kibi(sandbox, ["sync"]);
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
      const check = await kibi(sandbox, ["check"]);
      assert.strictEqual(check.exitCode, 0, `${check.stdout}${check.stderr}`);
      const query = await kibi(sandbox, ["query", "req"]);
      assert.strictEqual(query.exitCode, 0, `${query.stdout}${query.stderr}`);
      assert.ok(
        query.stdout.includes("REQ-SYSTEM-SMOKE"),
        "the synced requirement must be answered by Prolog",
      );
    });

    it("kibi-mcp answers kb_status, kb_query and kb_check", async () => {
      const server = await startMcpStdioServer({
        command: "node",
        args: [sandbox.kibiMcpBin],
        cwd: sandbox.repoDir,
        env: sandbox.env,
        timeoutMs: 120000,
      });
      try {
        const status = await server.call("kb_status", {});
        assert.notStrictEqual(status.isError, true, JSON.stringify(status));
        assert.ok(mcpToolPayload(status));
        const queried = await server.call("kb_query", { type: "req" });
        assert.notStrictEqual(queried.isError, true, JSON.stringify(queried));
        assert.ok(
          JSON.stringify(queried).includes("REQ-SYSTEM-SMOKE"),
          "kb_query must return the synced requirement from Prolog",
        );
        const checked = await server.call("kb_check", {});
        assert.notStrictEqual(checked.isError, true, JSON.stringify(checked));
      } finally {
        await server.close();
      }
    });
  });
}
