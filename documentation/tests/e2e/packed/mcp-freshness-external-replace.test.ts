import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";
import { mcpToolPayload, startMcpStdioServer } from "./mcp-stdio-client.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface QueryPayload {
  entities?: Array<{ id: string }>;
  rows?: Array<{ id: string }>;
}

/**
 * E2E: MCP refreshes an externally replaced branch KB snapshot.
 *
 * SCEN-mcp-kb-freshness-coverage — while the MCP server holds the branch
 * store, an external CLI sync that replaces the store must become visible to
 * subsequent MCP queries without a server restart.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: MCP external branch refresh", { timeout: 300000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;
    let server: Awaited<ReturnType<typeof startMcpStdioServer>> | undefined;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
        mkdirSync(join(sandbox.repoDir, ".kb", "scenarios"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-FRESH-ONE.md"),
          `---
id: SCEN-FRESH-ONE
title: External refresh first scenario
status: active
---

First scenario.
`,
        );
        stageSourceFile(sandbox, ".kb/scenarios/SCEN-FRESH-ONE.md");
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
        server = await startMcpStdioServer({
          command: "node",
          args: [sandbox.kibiMcpBin],
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (server) await server.close();
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it(
      "sees entities added by an external CLI sync without a restart",
      { timeout: 180000 },
      async () => {
        if (!server) return;

        const before = mcpToolPayload(
          await server.call("kb_query", { type: "scenario", limit: 100 }),
        ) as QueryPayload;
        const beforeIds = (before.entities ?? before.rows ?? []).map((row) => row.id);
        assert.ok(
          beforeIds.includes("SCEN-FRESH-ONE"),
          `baseline query must see the first scenario: ${JSON.stringify(beforeIds)} payload=${JSON.stringify(before).slice(0, 600)}`,
        );

        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-FRESH-TWO.md"),
          `---
id: SCEN-FRESH-TWO
title: External refresh second scenario
status: active
---

Second scenario.
`,
          "utf8",
        );
        stageSourceFile(sandbox, ".kb/scenarios/SCEN-FRESH-TWO.md");
        const externalSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          externalSync.exitCode,
          0,
          `${externalSync.stdout}${externalSync.stderr}`,
        );

        const after = mcpToolPayload(
          await server.call("kb_query", { type: "scenario", limit: 100 }),
        ) as QueryPayload;
        const afterIds = (after.entities ?? after.rows ?? []).map((row) => row.id);
        assert.ok(
          afterIds.includes("SCEN-FRESH-ONE"),
          `refreshed query must keep the first scenario: ${JSON.stringify(afterIds)}`,
        );
        assert.ok(
          afterIds.includes("SCEN-FRESH-TWO"),
          `refreshed query must see the externally synced scenario: ${JSON.stringify(afterIds)}`,
        );
      },
    );
  });
}
