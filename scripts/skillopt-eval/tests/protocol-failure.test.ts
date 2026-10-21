import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  feedbackTrajectories,
  parsePublicFeedback,
} from "../campaign-artifacts";
import { campaignPublicFeedback } from "../campaign-workflow";
import { buildPublicCatalog } from "../catalog";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { materializeFixtureRun } from "../fixtures/private";
import {
  protocolFailureCategory,
  runBridge,
} from "../runtime/bridge-cli-execution";
import { parseBridgeOptions } from "../runtime/bridge-cli-options";
import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import {
  CodexEpisodeReceiptSchema,
  replayCodexEpisode,
} from "../runtime/codex-episode";
import { type CellEvidence, scoreCell } from "../scoring/cell";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

// TEST-e2e-skillopt-host-neutral-optimization (offline unit layer)

const PRIVATE_PATH = "src/private-governed-module.ts";

function manifest(withContract: boolean) {
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      schemaVersion: "1.1.0",
      taskId: "held-out-usage-discovery-01",
      scorerKey: "scorer-0123456789abcdef",
      scorerReference: "scorer-ref-0123456789abcdef",
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
      fixtureSeedHash: "c".repeat(64),
      expectedFinalState: [
        {
          key: "final-discovery",
          query: "state://kibi-usage/discovery/complete",
          expected: true,
          critical: true,
        },
        {
          key: "workspace-isolated",
          query: "workspace://isolation/sentinel-count",
          expected: 0,
          critical: true,
        },
      ],
      orderedMcpPredicates: {
        required: [
          { tool: "kb_search", predicate: "sequence=1" },
          { tool: "kb_query", predicate: "sequence=2" },
        ],
        forbidden: [
          { tool: "kb_upsert", predicate: "before discovery or approval" },
        ],
      },
      ...(withContract
        ? {
            protocolContract: {
              requiredCalls: [
                {
                  tool: "kb_search",
                  args: { sourceLocations: [{ path: PRIVATE_PATH }] },
                },
                { tool: "kb_query" },
              ],
              forbiddenTools: [],
            },
          }
        : {}),
      isolationSentinels: [
        "PRIVATE_SENTINEL_secret",
        "SIBLING_SENTINEL_secret",
      ],
      rubric: [
        {
          key: "final_state",
          points: 60,
          criticalAssertionKeys: ["final-discovery"],
        },
        { key: "protocol", points: 25, criticalAssertionKeys: [] },
        {
          key: "isolation",
          points: 15,
          criticalAssertionKeys: ["workspace-isolated"],
        },
      ],
      blindedVariants: [
        { slot: "variant-a", variant: "one-shot" },
        { slot: "variant-b", variant: "baseline" },
        { slot: "variant-c", variant: "skillopt" },
      ],
      adversarialAssessments: [
        "malformed-task-descriptor",
        "prompt-injection",
        "generated-stale-state",
        "dirty-worktree",
        "long-materialization",
        "misleading-success-output",
        "mid-operation-interruption",
        "approval-boundary",
      ].map((assessmentClass) => ({
        class: assessmentClass,
        applicable: false,
        reason: "Not applicable to this scoring fixture.",
        fixturePath: null,
        approvalPhase: "not-applicable",
      })),
    }),
  );
}

function evidence(
  calls: readonly Readonly<{ tool: string; args?: Record<string, unknown> }>[],
): CellEvidence {
  const source = {
    complete: true,
    integrityValid: true,
    claims: [{ key: "shared-task-state", value: "complete" }],
  };
  return {
    finalState: {
      ...source,
      claims: [
        ...source.claims,
        { key: "final-discovery", value: true },
        { key: "workspace-isolated", value: 0 },
      ],
    },
    broker: {
      ...source,
      orderedCalls: calls.map(({ tool }, index) => ({
        tool,
        predicate: `sequence=${index + 1}`,
      })),
      rawCalls: calls.map(({ tool, args }) => ({
        tool,
        args: args ?? {},
        resultOk: true,
      })),
    },
    diagnostic: source,
    codex: source,
    isolation: { observedSentinels: [], violations: [] },
  };
}

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

describe("protocol failures are recorded as public evidence", () => {
  test("a missing required call names its tool and position, nothing private", () => {
    // Given a cell that searched but never queried
    const receipt = scoreCell(
      manifest(false),
      evidence([{ tool: "kb_search" }]),
    );

    // Then the protocol points are lost and the missing call is named
    expect(receipt.components.protocol).toBe(0);
    expect(receipt.protocolFailure).toEqual({
      kind: "missing_required_call",
      tool: "kb_query",
      position: 2,
    });
    expect(JSON.stringify(receipt)).not.toContain("PRIVATE_SENTINEL_secret");
    expect(JSON.stringify(receipt)).not.toContain("scorer-");

    // A complete protocol records nothing
    expect(
      scoreCell(
        manifest(false),
        evidence([{ tool: "kb_search" }, { tool: "kb_query" }]),
      ).protocolFailure,
    ).toBeUndefined();
    // A forbidden call loses the points without inventing a missing call
    const forbidden = scoreCell(
      manifest(false),
      evidence([
        { tool: "kb_upsert" },
        { tool: "kb_search" },
        { tool: "kb_query" },
      ]),
    );
    expect(forbidden.components.protocol).toBe(0);
    expect(forbidden.protocolFailure).toBeUndefined();
  });

  test("an argument-predicate miss names the call but never its private arguments", () => {
    const receipt = scoreCell(
      manifest(true),
      evidence([
        { tool: "kb_search", args: { query: "anything" } },
        { tool: "kb_query" },
      ]),
    );
    expect(receipt.protocolFailure).toEqual({
      kind: "missing_required_call",
      tool: "kb_search",
      position: 1,
    });
    expect(JSON.stringify(receipt)).not.toContain(PRIVATE_PATH);
  });

  test("the episode receipt keeps the failure for behavioral misses only", () => {
    const score = scoreCell(manifest(false), evidence([{ tool: "kb_search" }]));
    const input = {
      request: {
        schemaVersion: "1.0.0" as const,
        artifactType: "episode-request" as const,
        episodeId: "00000000-0000-4000-8000-000000000001",
        runId: "00000000-0000-4000-8000-000000000002",
        runLockHash: "a".repeat(64),
        variant: "skillopt" as const,
        skill: "kibi-usage" as const,
        taskId: "public-task",
        attempt: 1,
        prompt: "Complete the public fixture task.",
        workspaceFixtureHash: "b".repeat(64),
      },
      transcript: [
        JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
        JSON.stringify({
          type: "turn.completed",
          usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
        }),
      ].join("\n"),
      stderr: "",
      exitCode: 0,
      termination: "exit" as const,
      startedAt: "2026-07-23T10:00:00Z",
      finishedAt: "2026-07-23T10:00:01Z",
      evidence: {
        brokerTrace: '{"kind":"tools/call"}\n',
        diagnosticReceipt: '{"tool":"kb_search"}\n',
        finalState: '{"status":"fresh"}\n',
      },
      score,
      hiddenMarkers: [],
      forbiddenRoots: [],
      pricingHash: "c".repeat(64),
      priceAmount: 0,
    };
    const behavioral = replayCodexEpisode(input);
    expect(behavioral.result.status).toBe("behavioral-failure");
    expect(behavioral.result.score).toBe(75);
    expect(behavioral.protocolFailure).toEqual({
      kind: "missing_required_call",
      tool: "kb_query",
      position: 2,
    });
    // Infrastructure failures are not protocol evidence.
    const infrastructure = replayCodexEpisode({
      ...input,
      evidence: { ...input.evidence, brokerTrace: "" },
    });
    expect(infrastructure.protocolFailure).toBeUndefined();
    // Only a public tool name can be stored.
    expect(() =>
      CodexEpisodeReceiptSchema.parse({
        ...behavioral,
        protocolFailure: {
          kind: "missing_required_call",
          tool: "src/private-governed-module.ts",
          position: 2,
        },
      }),
    ).toThrow();
  });

  test("the trainer bridge passes the missing call to reflection as a failure category", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-protocol-bridge-"));
    roots.push(root);
    const [task] = buildPublicCatalog();
    if (task === undefined) throw new Error("catalog must contain a task");
    const fixtureRun = materializeFixtureRun({
      runRoot: join(root, "fixture-run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      publicTasks: [task],
      heldOutTasks: [],
    });
    const [entry] = fixtureRun.publicIndex.tasks;
    if (entry === undefined) throw new Error("index must contain the task");
    const artifactDirectory = join(root, "artifacts", "episodes", "episode-1");
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(join(artifactDirectory, "final-state.json"), "{}");
    const result = await runBridge(
      parseBridgeOptions([
        "--pipe",
        "--source-worktree",
        process.cwd(),
        "--artifact-root",
        join(root, "artifacts"),
        "--fixture-run-root",
        fixtureRun.roots.runRoot,
        "--codex-executable",
        "/staged/codex",
        "--bwrap-executable",
        "/staged/bwrap",
      ]),
      {
        schemaVersion: "1.0.0",
        artifactType: "skillopt-bridge-request",
        runId: "00000000-0000-4000-8000-000000000601",
        batchId: "protocol-1",
        skill: "kibi-usage",
        phase: "train",
        candidateBody: "Use the Kibi MCP workflow.\n",
        taskIds: [task.id],
        publicClaim: {
          taskId: task.id,
          text: task.prompt,
          publicManifestHash: entry.manifestHash,
          workspaceHash: entry.workspaceHash,
        },
        sourceLockHash: "a".repeat(64),
      },
      {
        defaultCodexCellDependencies,
        runCodexCell: async () => ({
          receipt: {
            result: {
              status: "behavioral-failure",
              hardPass: false,
              score: 75,
              criticalFailures: [],
            },
            protocolFailure: { tool: "kb_query", position: 2 },
          },
          artifactDirectory,
          receiptPath: join(artifactDirectory, "episode-receipt.json"),
        }),
      },
    );
    expect(result.rows[0]?.failureCategories).toEqual([
      "protocol-incomplete",
      protocolFailureCategory({ tool: "kb_query", position: 2 }),
    ]);
    expect(result.rows[0]?.failureCategories[1]).toBe(
      "missing-required-call:kb_query@2",
    );
  });

  test("campaign evaluations yield public feedback the next revise accepts", () => {
    const cell = (
      variant: string,
      family: string,
      protocolFailure?: { tool: string; position: number },
    ) => ({
      variant,
      family,
      ...(protocolFailure === undefined
        ? {}
        : {
            protocolFailure: {
              kind: "missing_required_call" as const,
              ...protocolFailure,
            },
          }),
    });
    const feedback = campaignPublicFeedback({
      cells: [
        cell("baseline", "discovery", { tool: "kb_query", position: 2 }),
        cell("baseline", "discovery"),
        cell("candidate-1", "discovery", { tool: "kb_query", position: 2 }),
        cell("candidate-1", "discovery", { tool: "kb_query", position: 2 }),
        cell("candidate-1", "mutation"),
      ],
    } as unknown as Parameters<typeof campaignPublicFeedback>[0]);
    expect(feedback.observations).toEqual([
      {
        family: "discovery",
        observation:
          "Protocol failed for baseline: required call 2 (kb_query) in 1 of 2 cells was never made in the required order.",
      },
      {
        family: "discovery",
        observation:
          "Protocol failed for candidate-1: required call 2 (kb_query) in 2 of 2 cells was never made in the required order.",
      },
    ]);
    // The revise step accepts it and passes it to the optimizer.
    expect(parsePublicFeedback(feedback)).toEqual(feedback);
    expect(feedbackTrajectories(feedback)[1]?.reflection).toContain(
      "required call 2 (kb_query)",
    );
  });
});
