import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { buildPublicCatalog } from "../catalog";
import { parsePublicTaskSpec } from "../fixtures/contracts";
import { hashWorkspace, writePublicWorkspace } from "../fixtures/workspace";
import { RequiredMcpStartupError } from "../runtime/canary-runtime";
import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import {
  EPISODE_OUTPUT_SCHEMA,
  runCodexCell,
} from "../runtime/codex-cell-runner";
import { ProcessControlError, type ProcessResult } from "../runtime/process";
import {
  HAPPY_STDOUT,
  cleanupRoots,
  fakeBroker,
  fixture,
  predicateFinalState,
  request,
  roots,
  sealedEvidence,
} from "./fixtures/codex-cell-runner-fixtures";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

afterEach(cleanupRoots);

test.each([
  ["thin_root_kb", "root_active_thin", true],
  ["seeded_partial_kb", "root_partial", false],
] as const)(
  "fixture %s exposes its intended activation through staged MCP before model dispatch",
  async (fixtureSetup, activationState, planEligible) => {
    const publicFixture = await fixture();
    const family =
      fixtureSetup === "thin_root_kb"
        ? "approval-plan-apply"
        : "repair-escalation";
    const task = buildPublicCatalog().find(
      (entry) =>
        entry.skill === "kibi-bootstrap" &&
        entry.family === family &&
        entry.split === "development",
    );
    if (task === undefined) throw new Error(`Missing public task ${family}`);
    writePublicWorkspace({
      root: publicFixture.root,
      task: parsePublicTaskSpec(task),
      canonicalSkillRoot: join(process.cwd(), "packages/cli/src/public/skills"),
    });
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-native-setup-"),
    );
    roots.push(artifactRoot);
    const options = {
      request: {
        ...request(hashWorkspace(publicFixture.root)),
        taskId: task.id,
      },
      fixtureRoot: publicFixture.root,
      sourceWorktree: process.cwd(),
      artifactRoot,
      targetSkill: "kibi-usage" as const,
      codexExecutable: process.execPath,
      bwrapExecutable: "/usr/bin/bwrap",
      env: process.env,
      finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
      evaluatorManifest: {
        ...evaluatorManifest("predicate"),
        fixtureSetup,
      },
      hiddenMarkers: [],
      pricingHash: "e".repeat(64),
      priceAmount: 0,
      timeoutMs: 1_000,
    };
    const dependencies = defaultCodexCellDependencies(options);
    const stopBeforeModel = new Error(
      "native fixture verified; no model dispatch",
    );
    let verified = false;
    await expect(
      runCodexCell(options, {
        ...dependencies,
        prepareLogin: async ({ privateCodexHome, sandboxHome }) => ({
          mode: "file",
          env: {
            ...process.env,
            CODEX_HOME: privateCodexHome,
            HOME: sandboxHome,
          },
          realCodexHome: join(artifactRoot, "unused-host-login"),
        }),
        stageBroker: async (workspace, sourceRoot) => {
          const broker = await dependencies.stageBroker(workspace, sourceRoot);
          expect(await readFile(broker.bundlePath, "utf8")).not.toContain(
            "Loans must retain a due date.",
          );
          const client = new Client({
            name: "fixture-readiness",
            version: "1",
          });
          try {
            await client.connect(
              new StdioClientTransport({
                command: broker.command,
                args: [...broker.args],
                cwd: broker.cwd,
                env: { ...process.env, KIBI_BRANCH: "skillopt-eval" },
                stderr: "pipe",
              }),
            );
            const result = await client.callTool({
              name: "kb_status",
              arguments: {},
            });
            expect(result.structuredContent).toMatchObject({
              status: "success",
              data: {
                bootstrap: {
                  activationState,
                  planEligible,
                },
              },
            });
            if (fixtureSetup === "thin_root_kb") {
              const approval = JSON.parse(
                await readFile(
                  join(workspace.target, "approval-state.json"),
                  "utf8",
                ),
              );
              expect(approval.mutationAllowed).toBe(false);
              expect(approval.delegatedApproval).toBeNull();
              expect(approval.bootstrapContext).toBeUndefined();
              const context = await client.callTool({
                name: "skillopt_ask_user",
                arguments: {
                  topic: "context",
                  question:
                    "What intent and authoritative sources should we use?",
                },
              });
              expect(context.structuredContent).toMatchObject({
                status: "answered",
              });
              const userAnswer = context.structuredContent as {
                answer: string;
                bootstrapContext?: unknown;
              };
              expect(userAnswer.bootstrapContext).toBeUndefined();
              const documentPath = /\]\(([^)]+\.md)\)/.exec(
                userAnswer.answer,
              )?.[1];
              expect(documentPath).toBe("documentation/library-policy.md");
              if (!documentPath)
                throw new Error("Operator did not supply a Markdown document");
              const document = await readFile(
                join(workspace.target, documentPath),
                "utf8",
              );
              const statement = /^Loans must .+$/m.exec(document)?.[0];
              expect(statement).toBe("Loans must retain a due date.");
              const bootstrapContext = {
                projectSummary: "The document describes a lending desk.",
                knowledgeSources: [
                  {
                    id: "operator-document",
                    kind: "specification",
                    title: "Project documentation",
                    locator: documentPath,
                    authority: "authoritative",
                  },
                ],
                intentClaims: [
                  {
                    sourceId: "operator-document",
                    reference: "loan-due-date",
                    statement,
                  },
                ],
              };
              await client.callTool({
                name: "kb_search",
                arguments: { query: "library" },
              });
              await client.callTool({
                name: "kb_query",
                arguments: { type: "req" },
              });
              const preview = await client.callTool({
                name: "kb_plan_bootstrap",
                arguments: {
                  bootstrapContext,
                  includeGenericMarkdown: false,
                },
              });
              const plan = (
                preview.structuredContent as {
                  data: { plan: Record<string, unknown> };
                }
              ).data.plan;
              expect(plan.status).toBe("ready");
              const requirements = (
                plan.candidates as {
                  entityType: string;
                  title: string;
                  sourceKind: string;
                }[]
              ).filter((candidate) => candidate.entityType === "req");
              expect(requirements).toHaveLength(1);
              expect(requirements[0]).toMatchObject({
                title: "Loans must retain a due date.",
                sourceKind: "intent_claim",
              });
              const answer = await client.callTool({
                name: "skillopt_ask_user",
                arguments: {
                  topic: "approval",
                  question: "Do you approve this preview?",
                  planHash: plan.planHash,
                },
              });
              expect(answer.structuredContent).toMatchObject({
                status: "approved",
                approvedPlanHash: plan.planHash,
              });
              const rechecked = await client.callTool({
                name: "kb_plan_bootstrap",
                arguments: { bootstrapContext, includeGenericMarkdown: false },
              });
              expect(
                (rechecked.structuredContent as { data: { plan: unknown } })
                  .data.plan,
              ).toEqual(plan);
              const applied = await client.callTool({
                name: "kb_apply_plan",
                arguments: { plan, approvedPlanHash: plan.planHash },
              });
              expect(applied.structuredContent).toMatchObject({
                status: "success",
              });
              const readback = await client.callTool({
                name: "kb_query",
                arguments: { type: "req" },
              });
              const entities = (
                readback.structuredContent as { data: { entities: unknown[] } }
              ).data.entities;
              expect(entities).toHaveLength(1);
              expect(entities[0]).toMatchObject({
                title: "Loans must retain a due date.",
                text_ref: "operator-document:loan-due-date",
              });
              const checked = await client.callTool({
                name: "kb_check",
                arguments: {},
              });
              expect(checked.structuredContent).toMatchObject({
                status: "success",
                data: { count: 0 },
              });
              const status = await client.callTool({
                name: "kb_status",
                arguments: {},
              });
              expect(status.structuredContent).toMatchObject({
                status: "success",
                data: { syncState: "fresh" },
              });
            }
            verified = true;
          } finally {
            await client.close();
          }
          throw stopBeforeModel;
        },
        run: async () => {
          throw new Error("Must not dispatch a model in an offline test");
        },
      }),
    ).rejects.toThrow(stopBeforeModel.message);
    expect(verified).toBe(true);
  },
  90_000,
);

async function longArtifactRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  const artifactRoot = join(
    root,
    ...Array.from(
      { length: 8 },
      (_, index) => `long-artifact-segment-${index}-${"x".repeat(40)}`,
    ),
  );
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  return artifactRoot;
}

describe("Codex cell runner", () => {
  test("Given fake runtime evidence When one target episode runs Then it is ephemeral, sealed, durable, and cleaned", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await longArtifactRoot("skillopt-cell-artifacts-");
    const episodeRequest = request(publicFixture.hash);
    const setupDiagnostic =
      '{"tool":"kb_semantic_advisor","status":"success"}\n';
    let ephemeralRoot = "";
    let ephemeralParent = "";
    let observedArgv: readonly string[] = [];
    let observedConfig = "";
    let probeBranch: string | undefined;
    let runBranch: string | undefined;
    let finalStateBranch: string | undefined;

    // When
    const completed = await runCodexCell(
      {
        request: episodeRequest,
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => {
          await writeFile(
            join(dirname(privateCodexHome), "workspace/.kb/usage.log"),
            setupDiagnostic,
          );
          return {
            mode: "file",
            env: { CODEX_HOME: privateCodexHome },
            realCodexHome: "/private/real-codex",
          };
        },
        stageBroker: async (workspace) => {
          expect(existsSync(join(workspace.target, ".kb/usage.log"))).toBe(
            false,
          );
          expect(
            await readFile(
              join(
                artifactRoot,
                "fixture-setup-diagnostics",
                `${episodeRequest.episodeId}.jsonl`,
              ),
              "utf8",
            ),
          ).toBe(setupDiagnostic);
          ephemeralRoot = workspace.root;
          ephemeralParent = dirname(ephemeralRoot);
          const broker = fakeBroker(workspace);
          await writeFile(broker.tracePath, '{"kind":"tools/call"}\n');
          await writeFile(
            join(workspace.target, ".kb/usage.log"),
            '{"tool":"kb_status"}\n',
          );
          return broker;
        },
        probeMcp: async ({ env }) => {
          probeBranch = env.KIBI_BRANCH;
          return { toolNames: ["kb_status"] };
        },
        run: async (argv, cwd, env, _timeout, stdin) => {
          observedArgv = argv;
          runBranch = env.KIBI_BRANCH;
          observedConfig = await readFile(
            join(ephemeralRoot, "codex-home/config.toml"),
            "utf8",
          );
          expect(
            JSON.parse(
              await readFile(
                join(
                  ephemeralRoot,
                  "workspace/.runtime/episode-output.schema.json",
                ),
                "utf8",
              ),
            ),
          ).toEqual(EPISODE_OUTPUT_SCHEMA);
          expect(EPISODE_OUTPUT_SCHEMA.additionalProperties).toBe(false);
          expect(cwd).toContain("/workspace");
          expect(stdin).toBe("Run the fixture task.");
          return {
            argv,
            stdout: HAPPY_STDOUT,
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        },
        finalState: async ({ env }) => {
          finalStateBranch = env.KIBI_BRANCH;
          return predicateFinalState();
        },
        diagnosticReceipt: async (workspace) =>
          readFile(join(workspace.target, ".kb/usage.log"), "utf8"),
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: (() => {
          const values = [
            new Date("2026-07-23T11:00:00Z"),
            new Date("2026-07-23T11:00:01Z"),
          ];
          return () => values.shift() ?? new Date("2026-07-23T11:00:01Z");
        })(),
      },
    );

    // Then
    expect(completed.receipt.result.status).toBe("completed");
    expect(observedArgv).toContain("--ephemeral");
    expect(observedArgv).toContain("--json");
    expect(observedConfig).toContain('approval_policy = "never"');
    expect(observedConfig).toContain("enabled = false");
    expect(observedConfig).toContain('".kb" = "deny"');
    expect(observedConfig).toContain("required = true");
    expect(probeBranch).toBe("skillopt-eval");
    expect(runBranch).toBe("skillopt-eval");
    expect(finalStateBranch).toBe("skillopt-eval");
    expect(ephemeralRoot).not.toContain(artifactRoot);
    expect(existsSync(ephemeralRoot)).toBe(false);
    expect(existsSync(ephemeralParent)).toBe(false);
    expect(existsSync(completed.artifactDirectory)).toBe(true);
    expect(
      await readFile(
        join(completed.artifactDirectory, "diagnostic-receipt.jsonl"),
        "utf8",
      ),
    ).toBe('{"tool":"kb_status"}\n');
    expect(existsSync(join(artifactRoot, ".fixture-setup-lock"))).toBe(true);
    expect(JSON.parse(await readFile(completed.receiptPath, "utf8"))).toEqual(
      completed.receipt,
    );
  });

  test("Given required MCP startup failure When the episode is attempted Then no host call occurs and cleanup is bounded", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await longArtifactRoot("skillopt-cell-mcp-fail-");
    let ephemeralRoot = "";
    let ephemeralParent = "";
    let hostCalls = 0;

    // When
    const completed = await runCodexCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => ({
          mode: "file",
          env: { CODEX_HOME: privateCodexHome },
          realCodexHome: "/private/real-codex",
        }),
        stageBroker: async (workspace) => {
          ephemeralRoot = workspace.root;
          ephemeralParent = dirname(ephemeralRoot);
          return fakeBroker(workspace);
        },
        probeMcp: async () => {
          throw new RequiredMcpStartupError("missing_tools");
        },
        run: async () => {
          hostCalls += 1;
          throw new TypeError("host_must_not_run");
        },
        finalState: async () => "",
        diagnosticReceipt: async () => "",
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: () => new Date("2026-07-23T11:00:00Z"),
      },
    );

    // Then
    expect(hostCalls).toBe(0);
    expect(completed.receipt.result.status).toBe("infrastructure-failure");
    expect(completed.receipt.result.criticalFailures).toContain(
      "missing_mcp_evidence",
    );
    expect(existsSync(ephemeralRoot)).toBe(false);
    expect(ephemeralRoot).not.toContain(artifactRoot);
    expect(existsSync(ephemeralParent)).toBe(false);
    expect(existsSync(join(artifactRoot, ".fixture-setup-lock"))).toBe(true);
  });

  test("Given a bounded process timeout When the episode terminates Then partial JSONL is replayed and cleanup still runs", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-timeout-"),
    );
    roots.push(artifactRoot);
    let ephemeralRoot = "";

    // When
    const completed = await runCodexCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => ({
          mode: "file",
          env: { CODEX_HOME: privateCodexHome },
          realCodexHome: "/private/real-codex",
        }),
        stageBroker: async (workspace) => {
          ephemeralRoot = workspace.root;
          const broker = fakeBroker(workspace);
          await writeFile(broker.tracePath, '{"kind":"tools/call"}\n');
          return broker;
        },
        probeMcp: async () => ({ toolNames: ["kb_status"] }),
        run: async (argv): Promise<ProcessResult> => {
          throw new ProcessControlError("timeout", {
            argv,
            stdout: JSON.stringify({ type: "thread.started" }),
            stderr: "",
            exitCode: -1,
            signal: "SIGTERM",
          });
        },
        finalState: async () => predicateFinalState(),
        diagnosticReceipt: async () => '{"tool":"kb_status"}\n',
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: () => new Date("2026-07-23T11:00:00Z"),
      },
    );

    // Then
    expect(completed.receipt.result.status).toBe("behavioral-failure");
    expect(completed.receipt.result.criticalFailures).toContain("timeout");
    expect(existsSync(ephemeralRoot)).toBe(false);
  });
});
