// implements REQ-kibi-legacy-migration-preview-v2
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";
import {
  runStdinRoute,
  sendMcpRequest,
  stable,
  startMcpServer,
} from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type LegacyMigrationPlan = {
  readonly planId: string;
  readonly readOnly: boolean;
  readonly status: string;
  readonly batches: readonly {
    readonly requirementId: string;
    readonly state: string;
    readonly sourceBinding: {
      readonly status: string;
      readonly sourceFile: string | null;
      readonly sourceKind: string;
      readonly sourceHash: string | null;
      readonly sourceByteLength: number;
      readonly persistedField: string | null;
      readonly existingTextRef: string | null;
      readonly existingSemanticText: string | null;
      readonly reason: string;
    };
    readonly requirementPropertyPatchPreview: Readonly<
      Record<string, unknown>
    > | null;
  }[];
};

type CoverageResult = {
  readonly legacyMigrationPlan?: LegacyMigrationPlan;
};

async function cliJson<T>(sandbox: TestSandbox, args: readonly string[]) {
  const result = await kibi(sandbox, [...args]);
  assert.strictEqual(
    result.exitCode,
    0,
    `${args.join(" ")} failed: ${result.stdout}${result.stderr}`,
  );
  const parsed = JSON.parse(result.stdout) as { data?: T };
  return (parsed.data ?? parsed) as T;
}

// executable_for TEST-kibi-legacy-migration-preview-v2
function assertSemanticSourceSeparation(
  plan: LegacyMigrationPlan,
  semanticText: string,
) {
  assert.strictEqual(plan.readOnly, true);
  assert.strictEqual(plan.status, "ready");
  assert.strictEqual(plan.batches.length, 1);
  const batch = plan.batches[0];
  assert.strictEqual(batch?.requirementId, "REQ-PACKED-SEMANTIC-SOURCE");
  assert.strictEqual(batch?.state, "ready_for_review");
  assert.deepStrictEqual(
    {
      status: batch?.sourceBinding.status,
      sourceKind: batch?.sourceBinding.sourceKind,
      sourceByteLength: batch?.sourceBinding.sourceByteLength,
      persistedField: batch?.sourceBinding.persistedField,
      existingTextRef: batch?.sourceBinding.existingTextRef,
      existingSemanticText: batch?.sourceBinding.existingSemanticText,
    },
    {
      status: "compatible",
      sourceKind: "authored_markdown_body",
      sourceByteLength: Buffer.byteLength(semanticText, "utf8"),
      persistedField: "semantic_text",
      existingTextRef: "src/policy.ts:42",
      existingSemanticText: semanticText,
    },
  );
  assert.ok(
    batch?.sourceBinding.sourceFile?.endsWith(
      "/documentation/requirements/REQ-PACKED-SEMANTIC-SOURCE.md",
    ),
  );
  assert.match(batch?.sourceBinding.sourceHash ?? "", /^[a-f0-9]{64}$/);
  assert.match(
    batch?.sourceBinding.reason ?? "",
    /preserving the independent text_ref evidence/,
  );
  const patch = batch?.requirementPropertyPatchPreview;
  assert.ok(patch);
  assert.strictEqual(patch.semantic_text, semanticText);
  assert.strictEqual(patch.semantic_source_field, "semantic_text");
  assert.strictEqual(
    patch.semantic_source_hash,
    batch?.sourceBinding.sourceHash,
  );
  assert.ok(Array.isArray(patch.logic_claims));
  assert.ok(Array.isArray(patch.semantic_inventory));
  assert.ok(!Object.hasOwn(patch, "text_ref"));
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: semantic source separation", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) return;
      tarballs = await packAll();
    });

    beforeEach(async () => {
      if (!hasProlog) return;
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
      await kibi(sandbox, ["init"]);
    });

    afterEach(async () => {
      if (sandbox) await sandbox.cleanup();
    });

    it(
      "preserves text_ref evidence while CLI and MCP preview semantic_text",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
        const requirementPath =
          "documentation/requirements/REQ-PACKED-SEMANTIC-SOURCE.md";
        const semanticText =
          "Policy changes must retain their authored requirement semantics.";
        createMarkdownFile(
          sandbox,
          requirementPath,
          {
            id: "REQ-PACKED-SEMANTIC-SOURCE",
            title: "Separate semantic prose from source evidence",
            type: "req",
            status: "open",
            text_ref: "src/policy.ts:42",
          },
          semanticText,
        );
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const query = await runStdinRoute(sandbox, "query", {
          id: "REQ-PACKED-SEMANTIC-SOURCE",
        });
        assert.strictEqual(query.exitCode, 0, `${query.stdout}${query.stderr}`);
        const queriedEnvelope = JSON.parse(query.stdout) as {
          data?: { entities: readonly Record<string, unknown>[] };
          entities?: readonly Record<string, unknown>[];
        };
        const queried = (queriedEnvelope.data ?? queriedEnvelope) as {
          entities: readonly Record<string, unknown>[];
        };
        assert.deepStrictEqual(
          {
            text_ref: queried.entities[0]?.text_ref,
            semantic_text: queried.entities[0]?.semantic_text,
          },
          { text_ref: "src/policy.ts:42", semantic_text: semanticText },
        );

        const sourceBefore = readFileSync(
          `${sandbox.repoDir}/${requirementPath}`,
          "utf8",
        );
        const statusBefore = await cliJson<{
          snapshotId: string;
          dirty: boolean;
        }>(sandbox, ["status", "--format", "json"]);
        const coverageArgs = [
          "coverage",
          "--by",
          "req",
          "--limit",
          "100",
          "--include-migration-preview",
          "--migration-limit",
          "1",
          "--format",
          "json",
        ] as const;
        const cli = await cliJson<CoverageResult>(sandbox, coverageArgs);
        const repeated = await cliJson<CoverageResult>(sandbox, coverageArgs);
        assert.ok(cli.legacyMigrationPlan);
        assertSemanticSourceSeparation(cli.legacyMigrationPlan, semanticText);
        assert.strictEqual(
          repeated.legacyMigrationPlan?.planId,
          cli.legacyMigrationPlan.planId,
        );

        const mcp = startMcpServer(sandbox);
        try {
          await sendMcpRequest(mcp, 1, "initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "semantic-source-e2e",
              version: "1.0.0",
            },
          });
          mcp.stdin?.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
          );
          const response = await sendMcpRequest(mcp, 2, "tools/call", {
            name: "kb_coverage",
            arguments: {
              by: "req",
              limit: 100,
              includeMigrationPreview: true,
              migrationLimit: 1,
            },
          });
          assert.ifError(response.error);
          const mcpStructured = response.result?.structuredContent as
            | { data?: CoverageResult }
            | CoverageResult
            | undefined;
          const mcpPlan = (
            (mcpStructured && "data" in mcpStructured
              ? mcpStructured.data
              : mcpStructured) as CoverageResult | undefined
          )?.legacyMigrationPlan;
          assert.ok(mcpPlan);
          assert.deepStrictEqual(
            stable(mcpPlan),
            stable(cli.legacyMigrationPlan),
          );
        } finally {
          mcp.kill();
        }

        const statusAfter = await cliJson<{
          snapshotId: string;
          dirty: boolean;
        }>(sandbox, ["status", "--format", "json"]);
        assert.deepStrictEqual(statusAfter, statusBefore);
        assert.strictEqual(
          readFileSync(`${sandbox.repoDir}/${requirementPath}`, "utf8"),
          sourceBefore,
        );
      },
    );
  });
}
