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

/**
 * E2E: MCP kb_model_requirement returns strict or observation write plans.
 *
 * SCEN-mcp-model-requirement-v1 — high-confidence normative prose yields a
 * strict-lane requirement write set through the real MCP surface, while
 * low-confidence prose is held back as an observation-lane review artifact.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: MCP model_requirement lanes", { timeout: 300000 }, () => {
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
        mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, ".kb", "requirements", "REQ-MODEL-BASE.md"),
          `---
id: REQ-MODEL-BASE
title: Model requirement baseline fixture
status: open
---

Baseline fixture.
`,
        );
        stageSourceFile(sandbox, ".kb/requirements/REQ-MODEL-BASE.md");
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
      "returns a strict-lane write set for high-confidence normative prose",
      { timeout: 120000 },
      async () => {
        if (!server) return;
        const result = mcpToolPayload(
          await server.call("kb_model_requirement", {
            text: "Customer data must be retained for 7 years.",
            confidence: 0.9,
          }),
        );
        assert.strictEqual(
          result.isStrict,
          true,
          `high-confidence prose must produce a strict write set: ${JSON.stringify(result).slice(0, 400)}`,
        );
        assert.ok(
          Array.isArray(result.applyPlan) && result.applyPlan.length > 0,
          "strict lane must carry an apply plan",
        );
      },
    );

    it(
      "returns an observation-lane review artifact for low-confidence prose",
      { timeout: 120000 },
      async () => {
        if (!server) return;
        const result = mcpToolPayload(
          await server.call("kb_model_requirement", {
            text: "Customer data must be retained for 7 years.",
            confidence: 0.3,
          }),
        );
        assert.strictEqual(
          result.isStrict,
          false,
          `low-confidence prose must be held for review: ${JSON.stringify(result).slice(0, 400)}`,
        );
      },
    );
  });
}
