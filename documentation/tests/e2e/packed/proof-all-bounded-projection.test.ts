import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";

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
const ARCHIVED_TEST_COUNT = 500;
const ARCHIVED_TITLE_BYTES = 22 * 1024;
const QUERY_PAGE_SIZE = 100;
const FULL_PROPERTY_BOUNDARY_BYTES = 10 * 1024 * 1024;
const TEST_ID = "TEST-PROJECTION-BOUNDARY";
const SCENARIO_ID = "SCEN-PROJECTION-BOUNDARY";
const REQUIREMENT_ID = "REQ-PROJECTION-BOUNDARY";
const SYMBOL_ID = "SYM-PROJECTION-PRODUCER-INVOCATION";

type QueryEntity = Record<string, unknown> & {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly status: string;
};

function commandOutput(result: {
  readonly stdout: string;
  readonly stderr: string;
}): string {
  return result.stdout + "\n" + result.stderr;
}

function assertCommandSucceeded(
  result: {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
  },
  label: string,
): void {
  assert.equal(
    result.exitCode,
    0,
    label + " exited " + result.exitCode + ".\n" + commandOutput(result),
  );
}

function archivedTitle(index: number): string {
  const prefix =
    "Archived test metadata payload " +
    String(index).padStart(4, "0") +
    " payload=";
  const remaining = ARCHIVED_TITLE_BYTES - prefix.length;
  assert.ok(remaining > 0);
  const suffix = "0123456789abcdef".repeat(
    Math.ceil(remaining / "0123456789abcdef".length),
  );
  const title = prefix + suffix.slice(0, remaining);
  assert.equal(Buffer.byteLength(title, "utf8"), ARCHIVED_TITLE_BYTES);
  return title;
}

function proofFixtureDocuments(): ReadonlyArray<{
  readonly path: string;
  readonly content: string;
}> {
  return [
    {
      path: ".kb/requirements/" + REQUIREMENT_ID + ".md",
      content: [
        "---",
        "id: " + REQUIREMENT_ID,
        "title: Proof selection stays bounded to contracted tests",
        "status: open",
        "priority: must",
        "links:",
        "  - type: specified_by",
        "    target: " + SCENARIO_ID,
        "---",
        "",
        "A prove-all campaign selects proof-contract tests without materializing unrelated archived test metadata.",
        "",
      ].join("\n"),
    },
    {
      path: ".kb/scenarios/" + SCENARIO_ID + ".md",
      content: [
        "---",
        "id: " + SCENARIO_ID,
        "title: Prove all with large archived metadata",
        "status: active",
        "links:",
        "  - type: verified_by",
        "    target: " + TEST_ID,
        "---",
        "",
        "Given a knowledge base with archived noncontract tests, when prove --all runs, then it executes the sole proof contract and keeps large archived metadata out of selection results.",
        "",
      ].join("\n"),
    },
    {
      path: ".kb/tests/" + TEST_ID + ".md",
      content: [
        "---",
        "id: " + TEST_ID,
        "title: Prove all selects the active contract from archived metadata",
        "status: passing",
        "source: tests/proof/projection-behavior.mjs",
        "verification_scope: end_to_end",
        "verification_perspective: consumer",
        "proof_bindings:",
        "  - symbol_id: " + SYMBOL_ID,
        "    target: default",
        "proof_contract:",
        "  version: kibi.proof-contract.v1",
        "  integration: projection-fixture",
        "  required_proofs:",
        "    - symbol_id: " + SYMBOL_ID,
        "      target: default",
        "  success_policy: all_required_first_attempt",
        "links:",
        "  - type: validates",
        "    target: " + SCENARIO_ID,
        "---",
        "",
        "The configured command verifies that the producer runs for exactly this contract-bearing test and receives a fresh snapshot.",
        "",
      ].join("\n"),
    },
    {
      path: ".kb/proof/integrations.json",
      content:
        JSON.stringify(
          {
            version: "kibi.proof-integration.v1",
            integrations: [
              {
                id: "projection-fixture",
                producer: "command",
                command: ["node", "tests/proof/projection-behavior.mjs"],
                artifact: ".kb/proof/runs/projection-fixture.json",
                targets: ["default"],
                description:
                  "Verifies prove-all invoked the producer for the selected contract with a fresh snapshot.",
              },
            ],
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "tests/proof/projection-behavior.mjs",
      content: [
        "import assert from \"node:assert/strict\";",
        "import { writeFileSync } from \"node:fs\";",
        "",
        "export function verifyProjectionProducerInvocation() {",
        "  assert.equal(process.env.KIBI_PROOF_RUN, \"1\");",
        "  assert.match(process.env.KIBI_PROOF_SNAPSHOT ?? \"\", /^[a-f0-9]{64}$/);",
        "  assert.equal(process.env.KIBI_PROOF_INTEGRATION, \"projection-fixture\");",
        "  assert.deepEqual(",
        "    JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? \"null\"),",
        "    [\"TEST-PROJECTION-BOUNDARY\"],",
        "  );",
        "  assert.ok(process.env.KIBI_PROOF_OUTPUT);",
        "  const artifact = {",
        "    version: \"kibi.proof-run.v1\",",
        "    producer: { name: \"projection-fixture-command\" },",
        "    integration: process.env.KIBI_PROOF_INTEGRATION,",
        "    command_argv: JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV ?? \"[]\"),",
        "    code_snapshot: process.env.KIBI_PROOF_SNAPSHOT,",
        "    environment: { os: process.platform, ci: \"packed-e2e\" },",
        "    run: {",
        "      outcome: \"passed\",",
        "      exit_code: 0,",
        "      started_at: new Date(Date.now() - 1000).toISOString(),",
        "      finished_at: new Date().toISOString(),",
        "    },",
        "    proof_results: [{",
        "      symbol_id: \"SYM-PROJECTION-PRODUCER-INVOCATION\",",
        "      target: \"default\",",
        "      outcome: \"passed\",",
        "      binding: \"aggregate_run\",",
        "      attempts: { status: \"unavailable\" },",
        "    }],",
        "  };",
        "  writeFileSync(",
        "    process.env.KIBI_PROOF_OUTPUT,",
        "    JSON.stringify(artifact, null, 2),",
        "  );",
        "  return artifact;",
        "}",
        "verifyProjectionProducerInvocation();",
        "process.stdout.write(\"Projection proof contract invocation passed.\\n\");",
        "",
      ].join("\n"),
    },
  ];
}

function archivedTestDocument(index: number): {
  readonly id: string;
  readonly title: string;
  readonly content: string;
} {
  const id = "TEST-ARCHIVE-PROJECTION-" + String(index).padStart(4, "0");
  const title = archivedTitle(index);
  return {
    id,
    title,
    content: [
      "---",
      "id: " + id,
      "title: " + JSON.stringify(title),
      "status: archived",
      "source: tests/proof/projection-behavior.mjs",
      "tags: [archived-metadata, prove-projection-stress]",
      "---",
      "",
      "This archived noncontract test retains schema-valid large title metadata for prove-all projection stress.",
      "",
    ].join("\n"),
  };
}

async function queryTest(
  sandbox: TestSandbox,
  testId: string,
): Promise<QueryEntity | undefined> {
  const queried = await kibi(sandbox, [
    "query",
    "test",
    "--format",
    "json",
    "--id",
    testId,
  ]);
  assertCommandSucceeded(queried, "query test " + testId);
  const payload = JSON.parse(queried.stdout) as QueryEntity[];
  return payload.find((entity) => entity.id === testId);
}

// executable_for TEST-e2e-proof-all-bounded-projection
export async function runProofAllBoundedProjectionWorkflow(): Promise<{
  readonly archivedTests: number;
  readonly totalTests: number;
  readonly reconstructedFullPropertyJsonBytes: number;
  readonly queryPages: number;
  readonly proved: number;
}> {
  const tarballs: Tarballs = await packAll();
  const sandbox: TestSandbox = createSandbox();
  try {
    await sandbox.install(tarballs);
    await sandbox.initGitRepo();
    const init = await kibi(sandbox, ["init", "--no-hooks"]);
    assertCommandSucceeded(init, "kibi init");

    const fixtureFiles = proofFixtureDocuments();
    for (const fixture of fixtureFiles) {
      const target = join(sandbox.repoDir, fixture.path);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, fixture.content, "utf8");
    }
    const stagedEmptySymbolManifest = await run(
      "git",
      ["add", "--", ".kb/symbols.yaml"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandSucceeded(
      stagedEmptySymbolManifest,
      "stage the generated empty symbol manifest",
    );

    for (const index of Array.from(
      { length: ARCHIVED_TEST_COUNT },
      (_, offset) => offset,
    )) {
      const document = archivedTestDocument(index);
      const target = join(
        sandbox.repoDir,
        ".kb/tests",
        document.id + ".md",
      );
      writeFileSync(target, document.content, "utf8");
    }

    for (const fixture of fixtureFiles) {
      if (!fixture.path.startsWith(".kb/")) continue;
      const stagedFixture = await run("git", ["add", "--", fixture.path], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      assertCommandSucceeded(
        stagedFixture,
        "stage knowledge-base fixture " + fixture.path,
      );
    }
    const stagedArchives = await run(
      "git",
      ["add", "--", ".kb/tests/TEST-ARCHIVE-PROJECTION-*.md"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandSucceeded(stagedArchives, "stage archived fixture tests");
    const stagedRuntime = await run("git", ["add", "--", "tests"], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });
    assertCommandSucceeded(stagedRuntime, "stage proof behavior fixture");
    const initialCommit = await run(
      "git",
      ["commit", "-m", "Initialize proof projection fixture"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandSucceeded(initialCommit, "commit proof projection fixture");

    const sync = await kibi(sandbox, ["sync"]);
    assertCommandSucceeded(sync, "sync fixture knowledge base");

    const symbolUpsertPath = join(sandbox.repoDir, "symbol-upsert.json");
    writeFileSync(
      symbolUpsertPath,
      JSON.stringify({
        type: "symbol",
        id: SYMBOL_ID,
        properties: {
          title: "verifyProjectionProducerInvocation",
          status: "active",
          sourceFile: "tests/proof/projection-behavior.mjs",
          symbol_role: "behavioral",
        },
        relationships: [
          { from: SYMBOL_ID, to: TEST_ID, type: "covered_by" },
          { from: SYMBOL_ID, to: REQUIREMENT_ID, type: "implements" },
        ],
      }),
      "utf8",
    );
    const preflight = await kibi(sandbox, [
      "validate-upsert",
      "--input",
      symbolUpsertPath,
    ]);
    assertCommandSucceeded(preflight, "validate projection producer symbol");
    const preflightEnvelope = JSON.parse(preflight.stdout) as {
      readonly status: string;
      readonly data?: { readonly valid?: boolean };
    };
    assert.equal(preflightEnvelope.status, "success");
    assert.equal(
      preflightEnvelope.data?.valid,
      true,
      "projection producer symbol must pass semantic upsert validation",
    );
    const upsert = await kibi(sandbox, [
      "upsert",
      "--input",
      symbolUpsertPath,
    ]);
    assertCommandSucceeded(upsert, "upsert projection producer symbol");
    const upsertEnvelope = JSON.parse(upsert.stdout) as {
      readonly status: string;
    };
    assert.equal(upsertEnvelope.status, "success");
    const refreshCoordinates = await kibi(sandbox, [
      "sync",
      "--refresh-symbol-coordinates",
    ]);
    assertCommandSucceeded(
      refreshCoordinates,
      "refresh projection producer coordinates",
    );
    const stagedSymbolArtifacts = await run(
      "git",
      ["add", "--", ".kb/symbols.yaml", ".kb/symbol-coordinates.yaml"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandSucceeded(stagedSymbolArtifacts, "stage generated symbol artifacts");
    const symbolCommit = await run(
      "git",
      ["commit", "-m", "Add projection producer symbol evidence"],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandSucceeded(symbolCommit, "commit projection producer symbol evidence");

    const queriedTests: QueryEntity[] = [];
    const queryPageBytes: number[] = [];
    let offset = 0;
    for (;;) {
      const page = await kibi(sandbox, [
        "query",
        "test",
        "--format",
        "json",
        "--limit",
        String(QUERY_PAGE_SIZE),
        "--offset",
        String(offset),
      ]);
      assertCommandSucceeded(page, "query full test properties at offset " + offset);
      queryPageBytes.push(Buffer.byteLength(page.stdout, "utf8"));
      assert.ok(
        queryPageBytes.at(-1)! < 8 * 1024 * 1024,
        "each public full-property page remains below the installed Prolog 8 MiB output bound",
      );
      const rows = JSON.parse(page.stdout) as QueryEntity[];
      queriedTests.push(...rows);
      offset += rows.length;
      if (rows.length < QUERY_PAGE_SIZE) break;
      assert.ok(
        queriedTests.length <= ARCHIVED_TEST_COUNT + 1,
        "the public query pagination did not terminate",
      );
    }

    assert.equal(queriedTests.length, ARCHIVED_TEST_COUNT + 1);
    const archived = queriedTests.filter((entity) =>
      entity.id.startsWith("TEST-ARCHIVE-PROJECTION-"),
    );
    assert.equal(archived.length, ARCHIVED_TEST_COUNT);
    for (const entity of archived) {
      assert.equal(entity.type, "test");
      assert.equal(entity.status, "archived");
      assert.equal(entity.title.length, ARCHIVED_TITLE_BYTES);
      assert.equal(entity.proof_contract, undefined);
      assert.equal(entity.proof_receipts, undefined);
    }

    const reconstructedFullPropertyJsonBytes = Buffer.byteLength(
      JSON.stringify(queriedTests),
      "utf8",
    );
    assert.ok(
      reconstructedFullPropertyJsonBytes > FULL_PROPERTY_BOUNDARY_BYTES,
      "the exact combined full-property JSON payload must exceed 10 MiB; bytes=" +
        reconstructedFullPropertyJsonBytes,
    );

    const prove = await kibi(sandbox, ["prove", "--all"], {
      timeoutMs: 300_000,
    });
    assertCommandSucceeded(prove, "installed kibi prove --all");
    const summaryLine = prove.stdout.trim().split(/\r?\n/).at(-1) ?? "";
    const summary = JSON.parse(summaryLine) as {
      readonly proved: number;
      readonly failed: number;
      readonly runs: ReadonlyArray<{
        readonly integration: string;
        readonly results: ReadonlyArray<{
          readonly testId: string;
          readonly outcome: string;
          readonly receiptId: string;
          readonly applied: boolean;
          readonly duplicate: boolean;
          readonly receiptCount: number;
          readonly gaps: ReadonlyArray<unknown>;
        }>;
      }>;
    };
    assert.equal(summary.proved, 1);
    assert.equal(summary.failed, 0);
    assert.equal(summary.runs.length, 1);
    assert.equal(summary.runs[0]?.integration, "projection-fixture");
    assert.equal(summary.runs[0]?.results.length, 1);
    const proofResult = summary.runs[0]?.results[0];
    assert.equal(proofResult?.testId, TEST_ID);
    assert.equal(proofResult?.outcome, "passed");
    assert.match(proofResult?.receiptId ?? "", /^PR-[a-f0-9]{24}$/);
    assert.equal(proofResult?.applied, true);
    assert.equal(proofResult?.duplicate, false);
    assert.equal(proofResult?.receiptCount, 1);
    assert.deepEqual(proofResult?.gaps, []);

    const recorded = await queryTest(sandbox, TEST_ID);
    assert.equal(recorded?.proof_receipts instanceof Array, true);
    const receipts = recorded?.proof_receipts as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    assert.equal(receipts?.length, 1);
    assert.equal(receipts?.[0]?.test_id, TEST_ID);
    assert.equal(receipts?.[0]?.outcome, "passed");
    assert.match(
      String(receipts?.[0]?.code_snapshot ?? ""),
      /^[a-f0-9]{64}$/,
    );
    const archivedAfter = await queryTest(
      sandbox,
      "TEST-ARCHIVE-PROJECTION-0000",
    );
    assert.equal(archivedAfter?.status, "archived");
    assert.equal(archivedAfter?.proof_contract, undefined);

    return {
      archivedTests: archived.length,
      totalTests: queriedTests.length,
      reconstructedFullPropertyJsonBytes,
      queryPages: queryPageBytes.length,
      proved: summary.proved,
    };
  } finally {
    await sandbox.cleanup();
  }
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed installed prove-all bounded projection",
    { concurrency: false },
    () => {
      before(async () => {
        if (!checkPrologAvailable()) {
          throw new Error(
            "SWI-Prolog is required for the prove-all projection regression",
          );
        }
      });

      it(
        "selects the sole proof contract without materializing 500 large archived test records",
        { timeout: 300_000 },
        async (testContext) => {
          const outcome = await runProofAllBoundedProjectionWorkflow();
          testContext.diagnostic(JSON.stringify(outcome));
        },
      );
    },
  );
}
