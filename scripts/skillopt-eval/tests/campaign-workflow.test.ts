import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../../packages/cli/src/public/skills";
import { composeCampaignManifest, sha256Text } from "../campaign-artifacts";
import {
  type CampaignDependencies,
  runConfirmCampaign,
  runEvaluateCampaign,
  runPackageCampaign,
  runReviseCampaign,
} from "../campaign-workflow";
import { CANONICAL_SKILLS } from "../catalog";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { surface } from "../real-workflow";
import {
  type PublicTaskDescriptor,
  canonicalHash,
} from "../real-workflow-types";
import { replayCodexEpisode } from "../runtime/codex-episode";
import { normalizeCodexJsonl } from "../runtime/codex-events";
import type { CellReceipt } from "../scoring/cell";

const sourceSurface = {
  body: "Portable baseline prose.\n\n## Discovery\nUse exact lookup.\n\n## Closeout\nRead the final state.\n",
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
} as const;

const tasks: PublicTaskDescriptor[] = [
  "discovery-exact-lookup",
  "safe-mutation-direction",
  "fact-predicate-modeling",
  "validation-recovery",
].map((family) => ({
  id: `kibi-usage-${family}-development-1`,
  family,
  split: "development" as const,
  publicClaim: {
    taskId: `kibi-usage-${family}-development-1`,
    text: `Public task ${family}`,
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
  },
}));

function candidateManifest() {
  return composeCampaignManifest({
    skill: "kibi-usage",
    surface: sourceSurface,
    insertions: [
      {
        headingAnchor: "## Discovery",
        paragraph:
          "Search the supplied target, apply only the authorized operation, and read it back.",
      },
    ],
    provenance: { kind: "host-composed", modelSource: "none" },
  });
}

function gates() {
  return {
    verdict: "pass" as const,
    targetModel: "gpt-5.6-luna" as const,
    optimizerModel: "gpt-5.6-sol" as const,
    skilloptCommit: "a".repeat(40) as `${string}`,
    codexVersion: "test",
    authMode: "file" as const,
    bwrap: true,
    sourceClean: true,
    configValid: true,
    paidModelCalls: 0 as const,
  };
}

function canary() {
  return {
    verdict: "pass" as const,
    runId: "canary",
    targetModel: "gpt-5.6-luna" as const,
    optimizerModel: "gpt-5.6-sol" as const,
    authMode: "file" as const,
    paidModelCalls: 2 as const,
    modelInvocationAttempts: 2 as const,
    modelRuns: [],
    events: [],
  };
}

function trustedSample(
  input: Readonly<{
    variant: { bodyHash: string; variant: string };
    task: { id: string };
    replicate: 1 | 2 | 3;
    runLockHash: string;
    score: number;
    hardPass?: boolean;
    criticalFailures?: readonly string[];
  }>,
): Awaited<ReturnType<CampaignDependencies["evaluateSample"]>> {
  const id = `${input.task.id}-${input.replicate}-${input.variant.bodyHash}`;
  return {
    score: input.score,
    hardPass: input.hardPass ?? false,
    criticalFailures: [...(input.criticalFailures ?? [])],
    securityFailures: [],
    receiptPath: `/trusted/${id}/episode-receipt.json`,
    usage: { inputTokens: 11, cachedInputTokens: 2, outputTokens: 3 },
    receiptStatus: "completed",
    receiptSha256: "a".repeat(64),
    artifactDirectory: `/trusted/${id}`,
    artifactRefs: [
      {
        name: "evidenceIndex",
        path: "evidence-index.json",
        sha256: "b".repeat(64),
      },
    ],
    requestPath: `/trusted/${id}/campaign-request.json`,
    requestSha256: "c".repeat(64),
    requestHash: "d".repeat(64),
    bodyLabel: `variant-${"e".repeat(16)}`,
    runLockHash: input.runLockHash,
    violations: [],
    isolationSentinels: [],
  };
}

async function writeTrustedCell(
  input: Parameters<CampaignDependencies["runCell"]>[0],
): Promise<Awaited<ReturnType<CampaignDependencies["runCell"]>>> {
  const transcript = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({
      type: "turn.completed",
      usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 },
    }),
  ].join("\n");
  const stderr = "sanitized stderr\n";
  const evidence = {
    brokerTrace: '{"kind":"tools/call"}\n',
    diagnosticReceipt: '{"tool":"kb_status"}\n',
    finalState: '{"status":"fresh"}\n',
  } as const;
  const score: CellReceipt = {
    outcome: "fail",
    terminalCategory: "behavioral_failure",
    score: input.request.variant === "baseline" ? 40 : 45,
    soft: 1,
    hard: 0,
    retryable: false,
    adoptionEligible: false,
    components: { finalState: 20, protocol: 10, isolation: 10 },
    criticalFailures:
      input.request.variant === "baseline" ? ["isolation-sentinel"] : [],
    conflictKeys: [],
  };
  const receipt = replayCodexEpisode({
    request: input.request,
    transcript,
    stderr,
    exitCode: 0,
    termination: "exit",
    startedAt: "2026-09-14T10:00:00Z",
    finishedAt: "2026-09-14T10:00:01Z",
    evidence,
    score,
    hiddenMarkers: [],
    forbiddenRoots: [],
    pricingHash: "f".repeat(64),
    priceAmount: 0,
  });
  const artifactDirectory = join(
    input.artifactRoot,
    "episodes",
    input.request.episodeId,
  );
  await mkdir(artifactDirectory, { recursive: true });
  const normalized = normalizeCodexJsonl(transcript, {
    hiddenMarkers: [],
    forbiddenRoots: [],
  });
  const contents = new Map<string, string>([
    ["raw-host.jsonl", transcript],
    ["raw-stderr.log", stderr],
    [
      "normalized-events.jsonl",
      normalized.events.map((event) => JSON.stringify(event)).join("\n"),
    ],
    ["broker-trace.jsonl", evidence.brokerTrace],
    ["diagnostic-receipt.jsonl", evidence.diagnosticReceipt],
    ["final-state.json", evidence.finalState],
    ["evidence-index.json", `${JSON.stringify(receipt.evidenceIndex)}\n`],
  ]);
  for (const [name, content] of contents)
    await writeFile(join(artifactDirectory, name), content);
  const receiptPath = join(artifactDirectory, "episode-receipt.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
  return { receipt, artifactDirectory, receiptPath };
}

function defaultCellDependencies(
  input: Partial<CampaignDependencies>,
  overrides: Partial<CampaignDependencies> = {},
): Partial<CampaignDependencies> {
  const {
    evaluateSample: _evaluateSample,
    verifyCell: _verifyCell,
    ...trustedDefaults
  } = input;
  return {
    ...trustedDefaults,
    ...overrides,
    resolveFixture: async ({ publicClaim }) =>
      ({
        publicClaim,
        workspaceRoot: "/tmp/trusted-workspace",
        workspaceHash: "b".repeat(64),
        evaluatorManifest: {},
        fixtureClaim: {},
      }) as Awaited<ReturnType<CampaignDependencies["resolveFixture"]>>,
    runCell: writeTrustedCell,
  };
}

async function writeAssembledSkills(
  input: Parameters<CampaignDependencies["assemble"]>[0],
) {
  const sourceSkillsDir = join(
    input.sourceRepoRoot,
    "packages/cli/src/public/skills",
  );
  const targetSkillsDir = join(input.workspace, ".agents/skills");
  const candidates = input.candidates ?? {};
  const skills = [];
  for (const id of CANONICAL_SKILLS) {
    const source = loadBundledSkillFrom(sourceSkillsDir, id);
    const sourceMarkdown = await readFile(
      join(source.rootDir, "SKILL.md"),
      "utf8",
    );
    const prefix = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(sourceMarkdown)?.[0];
    if (prefix === undefined) throw new Error("assembled_frontmatter_missing");
    const body = candidates[id]?.body ?? source.body;
    const root = join(targetSkillsDir, id);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "SKILL.md"), `${prefix}${body}`);
    const resources = Object.fromEntries(
      [...(source.manifest.resources ?? [])]
        .sort()
        .map((resource) => [
          resource,
          readBundledSkillResourceFrom(sourceSkillsDir, id, resource),
        ]),
    );
    for (const [resource, content] of Object.entries(resources)) {
      const target = join(root, resource);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, content);
    }
    const assembled = loadBundledSkillFrom(targetSkillsDir, id);
    const assembledResources = Object.fromEntries(
      [...(assembled.manifest.resources ?? [])]
        .sort()
        .map((resource) => [
          resource,
          readBundledSkillResourceFrom(targetSkillsDir, id, resource),
        ]),
    );
    skills.push({
      id,
      bodyHash: sha256Text(assembled.body),
      frontmatterHash: canonicalHash(assembled.manifest),
      resourcesHash: canonicalHash(assembledResources),
      bodyChanged: assembled.body !== source.body,
    });
  }
  return { skills };
}

async function actualCandidateManifest() {
  const current = await surface(process.cwd(), "kibi-usage");
  return composeCampaignManifest({
    skill: "kibi-usage",
    surface: current,
    insertions: [
      {
        headingAnchor: "## Interface Selection",
        paragraph:
          "Use the narrowest approved interface, then read back the exact resulting state.",
      },
    ],
    provenance: { kind: "host-composed", modelSource: "none" },
  });
}

function dependencies(options: Readonly<{ badAfterFirst?: boolean }> = {}) {
  const calls: string[] = [];
  let samples = 0;
  const deps: Partial<CampaignDependencies> = {
    sourceClean: async () => {
      calls.push("source-clean");
      return true;
    },
    sourceFence: async () => ({
      head: "a".repeat(40),
      treeHash: "b".repeat(64),
      files: 1,
    }),
    surface: async () => sourceSurface,
    fixtureReadiness: async () => {
      calls.push("fixture-readiness");
    },
    materializeFixtures: async ({ runRoot }) => {
      calls.push("materialize");
      return runRoot;
    },
    initializeBudget: async () => {
      calls.push("budget");
      return {} as never;
    },
    runPreflight: async () => {
      calls.push("preflight");
      return gates() as never;
    },
    runCanary: async () => {
      calls.push("canary");
      return canary() as never;
    },
    createRuntimeLease: async () => ({
      root: "/tmp/runtime",
      codexExecutable: "/tmp/codex",
      bwrapExecutable: "/tmp/bwrap",
      codeModeHostExecutable: "/tmp/codex-code-mode-host",
      cleanup: async () => {
        calls.push("runtime-cleanup");
      },
    }),
    developmentTasks: async () => tasks,
    evaluateSample: async ({ variant, task, replicate, runLockHash }) => {
      samples += 1;
      if (options.badAfterFirst && samples === 2)
        throw new Error("evaluator_unavailable");
      const score = variant.variant === "baseline" ? 40 : 45;
      return trustedSample({
        variant,
        task,
        replicate,
        runLockHash,
        score,
      });
    },
    verifyCell: async () => {},
  };
  return { deps, calls };
}

async function tempArtifact(
  name: string,
): Promise<{ parent: string; root: string }> {
  const parent = await mkdtemp(join(tmpdir(), `campaign-${name}-`));
  return { parent, root: join(parent, "artifacts") };
}

describe("campaign paid orchestration", () => {
  test("validates and freezes candidates before preflight/canary, then retains paired cells", async () => {
    const output = await tempArtifact("evaluate");
    const fake = dependencies();
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: output.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "evaluate-run",
        dependencies: fake.deps,
      });
      expect(evaluation.status).toBe("complete");
      expect(evaluation.cells).toHaveLength(8);
      expect(evaluation.pairings).toHaveLength(4);
      expect(evaluation.aggregate.noRegression).toBe(true);
      expect(fake.calls.indexOf("fixture-readiness")).toBeLessThan(
        fake.calls.indexOf("canary"),
      );
      expect(
        JSON.parse(
          await readFile(join(output.root, "frozen-bodies.json"), "utf8"),
        ).candidateBodyHashes,
      ).toHaveLength(1);
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("default evaluation binds the real receipt, request replicate, usage, and evidence", async () => {
    const output = await tempArtifact("default-cell");
    const fake = dependencies();
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: output.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000001",
        dependencies: defaultCellDependencies(fake.deps),
      });
      const baseline = evaluation.cells.find(
        (cell) => cell.variant === "baseline",
      );
      expect(baseline).toMatchObject({
        score: 40,
        criticalFailures: ["isolation-sentinel"],
        isolationSentinels: ["isolation-sentinel"],
        receiptStatus: "behavioral-failure",
        usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3 },
      });
      if (baseline === undefined) throw new Error("baseline_cell_missing");
      const request = JSON.parse(await readFile(baseline.requestPath, "utf8"));
      expect(request.request.replicate).toBe(1);
      expect(request.request.runId).toBe(
        "00000000-0000-4000-8000-000000000001",
      );
      expect(request.request.runLockHash).toBe(baseline.runLockHash);
      expect(baseline.receiptPath).toBe(
        join(baseline.artifactDirectory, "episode-receipt.json"),
      );
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("confirmation rejects a tampered persisted receipt before the canary", async () => {
    const priorOutput = await tempArtifact("tamper-prior");
    const confirmOutput = await tempArtifact("tamper-confirm");
    const fake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: priorOutput.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000002",
        dependencies: defaultCellDependencies(fake.deps),
      });
      const tampered = prior.cells[0];
      if (tampered === undefined) throw new Error("tampered_cell_missing");
      const receipt = JSON.parse(await readFile(tampered.receiptPath, "utf8"));
      receipt.result.score = 41;
      await writeFile(tampered.receiptPath, `${JSON.stringify(receipt)}\n`);
      fake.calls.length = 0;

      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: confirmOutput.root,
          previousEvaluation: prior,
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          runId: "00000000-0000-4000-8000-000000000003",
          dependencies: defaultCellDependencies(fake.deps),
        }),
      ).rejects.toThrow("prior_cell_evidence_mismatch");
      expect(fake.calls).not.toContain("canary");
    } finally {
      await rm(priorOutput.parent, { recursive: true, force: true });
      await rm(confirmOutput.parent, { recursive: true, force: true });
    }
  });

  test("rejects candidate tampering and an insufficient cap before paid dispatch", async () => {
    const output = await tempArtifact("guards");
    const fake = dependencies();
    const manifest = candidateManifest();
    try {
      await expect(
        runEvaluateCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: output.root,
          skill: "kibi-usage",
          manifests: [{ ...manifest, frozenBodyHash: "c".repeat(64) }],
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("manifest_body_hash_mismatch");
      expect(fake.calls).not.toContain("canary");

      const second = await tempArtifact("cap");
      const capFake = dependencies();
      try {
        await expect(
          runEvaluateCampaign({
            sourceRoot: process.cwd(),
            artifactRoot: second.root,
            skill: "kibi-usage",
            manifests: [manifest],
            repeats: 1,
            maxTargetEpisodes: 7,
            allowPaid: true,
            dependencies: capFake.deps,
          }),
        ).rejects.toThrow("target_budget_insufficient_before_canary");
        expect(capFake.calls).not.toContain("canary");
      } finally {
        await rm(second.parent, { recursive: true, force: true });
      }
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("persists the attempted counter and successful cells on partial failure", async () => {
    const output = await tempArtifact("partial");
    const fake = dependencies({ badAfterFirst: true });
    try {
      await expect(
        runEvaluateCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: output.root,
          skill: "kibi-usage",
          manifests: [candidateManifest()],
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("evaluator_unavailable");
      const state = JSON.parse(
        await readFile(join(output.root, "campaign-state.json"), "utf8"),
      );
      expect(state.status).toBe("failed");
      expect(state.attemptedCells).toBe(2);
      expect(state.cells).toHaveLength(1);
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });
});

describe("campaign confirmation", () => {
  test("retains prior cells and builds explicit run/task/rep pairings", async () => {
    const first = await tempArtifact("prior");
    const second = await tempArtifact("confirm");
    const fake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: first.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "prior-run",
        dependencies: fake.deps,
      });
      const priorSnapshot = JSON.stringify(prior);
      const confirmed = await runConfirmCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: second.root,
        previousEvaluation: prior,
        repeats: 2,
        maxTargetEpisodes: 16,
        allowPaid: true,
        runId: "new-run",
        dependencies: fake.deps,
      });
      expect(confirmed.cells).toHaveLength(24);
      expect(confirmed.runs).toEqual([
        {
          runId: "prior-run",
          kind: "prior",
          cellCount: 8,
          repeats: 1,
          artifactRoot: first.root,
        },
        {
          runId: "new-run",
          kind: "new",
          cellCount: 16,
          repeats: 2,
          artifactRoot: second.root,
        },
      ]);
      expect(new Set(confirmed.cells.map((cell) => cell.runId))).toEqual(
        new Set(["prior-run", "new-run"]),
      );
      expect(confirmed.pairings).toHaveLength(12);
      expect(JSON.stringify(prior)).toBe(priorSnapshot);
      expect(
        JSON.parse(await readFile(join(first.root, "evaluation.json"), "utf8")),
      ).toEqual(prior);
    } finally {
      await rm(first.parent, { recursive: true, force: true });
      await rm(second.parent, { recursive: true, force: true });
    }
  });

  test("rejects a confirmation regression after saving the combined evidence", async () => {
    const first = await tempArtifact("regression-prior");
    const second = await tempArtifact("regression-confirm");
    const firstFake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: first.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        dependencies: firstFake.deps,
      });
      const regressionBase = dependencies();
      const regressionDeps: Partial<CampaignDependencies> = {
        ...regressionBase.deps,
        evaluateSample: async ({ variant, task, replicate, runLockHash }) =>
          trustedSample({
            variant,
            task,
            replicate,
            runLockHash,
            score: variant.variant === "baseline" ? 50 : 20,
          }),
      };
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: second.root,
          previousEvaluation: prior,
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          dependencies: regressionDeps,
        }),
      ).rejects.toThrow("confirmation_noregression_failed");
      const saved = JSON.parse(
        await readFile(join(second.root, "evaluation.json"), "utf8"),
      );
      expect(saved.status).toBe("complete");
      expect(saved.cells).toHaveLength(16);
      expect(saved.aggregate.noRegression).toBe(false);
      expect(
        JSON.parse(await readFile(join(second.root, "campaign.json"), "utf8"))
          .status,
      ).toBe("failed");
    } finally {
      await rm(first.parent, { recursive: true, force: true });
      await rm(second.parent, { recursive: true, force: true });
    }
  });
});

describe("campaign evidence integrity", () => {
  test("package rejects resealed derived evidence that mismatches verified cells", async () => {
    const manifest = await actualCandidateManifest();
    const fake = dependencies();
    const evaluationOutput = await tempArtifact("integrity-evaluation");
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: evaluationOutput.root,
        skill: "kibi-usage",
        manifests: [manifest],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000007",
        dependencies: defaultCellDependencies(fake.deps, { surface }),
      });
      const packageDependencies = defaultCellDependencies(fake.deps, {
        surface,
        assemble: writeAssembledSkills,
      });
      const { contentHash: _contentHash, ...body } = evaluation;
      const forgedAggregate = {
        ...body.aggregate,
        candidates: body.aggregate.candidates.map((arm) => ({
          ...arm,
          mean: 100,
          hardPasses: arm.cells,
          securityFailures: 0,
        })),
        noRegression: true,
        regressions: [],
      };
      const originalFamily = body.cells[0]?.family;
      if (originalFamily === undefined) throw new Error("family_cell_missing");
      const duplicateCell = body.cells[1];
      if (duplicateCell === undefined)
        throw new Error("duplicate_cell_missing");
      const forgedFamily = "forged-family";
      const relabelFamilies = <
        T extends { families: Readonly<Record<string, unknown>> },
      >(
        arm: T,
      ): T => ({
        ...arm,
        families: Object.fromEntries(
          Object.entries(arm.families).map(([family, summary]) => [
            family === originalFamily ? forgedFamily : family,
            summary,
          ]),
        ),
      });
      const cases = [
        {
          name: "aggregate",
          patch: { aggregate: forgedAggregate },
          error: "evaluation_aggregate_mismatch",
        },
        {
          name: "pairings",
          patch: { pairings: body.pairings.slice(0, -1) },
          error: "evaluation_pairing_mismatch",
        },
        {
          name: "run-summary",
          patch: {
            runs: body.runs.map((run) => ({ ...run, repeats: 2 as const })),
          },
          error: "cell_count_mismatch",
        },
        {
          name: "family",
          patch: {
            cells: body.cells.map((cell) =>
              cell.family === originalFamily
                ? { ...cell, family: forgedFamily }
                : cell,
            ),
            aggregate: {
              ...body.aggregate,
              baseline: relabelFamilies(body.aggregate.baseline),
              candidates: body.aggregate.candidates.map(relabelFamilies),
            },
          },
          error: "cell_family_mismatch",
        },
        {
          name: "cell-multiset",
          patch: {
            cells: body.cells.map((cell, index) =>
              index === 0 ? duplicateCell : cell,
            ),
          },
          error: "cell_duplicate",
        },
      ] as const;
      for (const [index, testCase] of cases.entries()) {
        const packageOutput = await tempArtifact(`integrity-${index}`);
        try {
          const forgedBody = { ...body, ...testCase.patch };
          const forged = {
            ...forgedBody,
            contentHash: contractHash(JsonValueSchema.parse(forgedBody)),
          };
          await expect(
            runPackageCampaign({
              sourceRoot: process.cwd(),
              artifactRoot: packageOutput.root,
              manifests: [manifest],
              evaluation: forged,
              dependencies: packageDependencies,
            }),
          ).rejects.toThrow(testCase.error);
        } finally {
          await rm(packageOutput.parent, { recursive: true, force: true });
        }
      }
    } finally {
      await rm(evaluationOutput.parent, { recursive: true, force: true });
    }
  });

  test("confirmation rejects prior cells with altered security fields before the canary", async () => {
    const priorOutput = await tempArtifact("security-prior");
    const confirmOutput = await tempArtifact("security-confirm");
    const fake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: priorOutput.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000008",
        dependencies: defaultCellDependencies(fake.deps),
      });
      const compromised = prior.cells.find(
        (cell) => cell.securityFailures.length > 0,
      );
      if (compromised === undefined) throw new Error("security_cell_missing");
      const { contentHash: _contentHash, ...body } = prior;
      const tamperedBody = {
        ...body,
        cells: body.cells.map((cell) =>
          cell === compromised
            ? { ...cell, securityFailures: [], isolationSentinels: [] }
            : cell,
        ),
      };
      const tampered = {
        ...tamperedBody,
        contentHash: contractHash(JsonValueSchema.parse(tamperedBody)),
      };
      fake.calls.length = 0;
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: confirmOutput.root,
          previousEvaluation: tampered,
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          runId: "00000000-0000-4000-8000-000000000009",
          dependencies: defaultCellDependencies(fake.deps),
        }),
      ).rejects.toThrow("prior_cell_evidence_mismatch");
      expect(fake.calls).not.toContain("canary");
    } finally {
      await rm(priorOutput.parent, { recursive: true, force: true });
      await rm(confirmOutput.parent, { recursive: true, force: true });
    }
  });

  test("confirmation rejects prior cells whose family leaves the task catalog", async () => {
    const priorOutput = await tempArtifact("family-prior");
    const confirmOutput = await tempArtifact("family-confirm");
    const fake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: priorOutput.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "family-prior-run",
        dependencies: fake.deps,
      });
      const { contentHash: _contentHash, ...body } = prior;
      const tamperedBody = {
        ...body,
        cells: body.cells.map((cell, index) =>
          index === 0 ? { ...cell, family: "unbound-family" } : cell,
        ),
      };
      const tampered = {
        ...tamperedBody,
        contentHash: contractHash(JsonValueSchema.parse(tamperedBody)),
      };
      fake.calls.length = 0;
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: confirmOutput.root,
          previousEvaluation: tampered,
          repeats: 1,
          maxTargetEpisodes: 8,
          allowPaid: true,
          runId: "family-confirm-run",
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("cell_family_mismatch");
      expect(fake.calls).not.toContain("canary");
    } finally {
      await rm(priorOutput.parent, { recursive: true, force: true });
      await rm(confirmOutput.parent, { recursive: true, force: true });
    }
  });
});

describe("campaign revise/package boundaries", () => {
  test("requires paid acknowledgement before the optimizer boundary", async () => {
    const output = await tempArtifact("revise-gate");
    let optimizerCalls = 0;
    const base = dependencies();
    const deps: Partial<CampaignDependencies> = {
      ...base.deps,
      runOptimizerStep: async () => {
        optimizerCalls += 1;
        throw new Error("should_not_run");
      },
    };
    try {
      await expect(
        runReviseCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: output.root,
          skill: "kibi-usage",
          objective: "Improve recovery prose.",
          headingAnchor: "## Discovery",
          allowPaid: false,
          dependencies: deps,
        }),
      ).rejects.toThrow("allow_paid_required");
      expect(optimizerCalls).toBe(0);
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("binds model provenance to the normalized optimizer receipt", async () => {
    const output = await tempArtifact("revise-receipt");
    const paragraph = "Improve recovery prose.";
    const objective = "Improve recovery prose.";
    const body = sourceSurface.body.replace(
      "## Discovery",
      `${paragraph}\n\n## Discovery`,
    );
    const fake: Partial<CampaignDependencies> = {
      ...dependencies().deps,
      runOptimizerStep: async () => ({
        body,
        development: { mean: 0, hardPasses: 0, worstFamilyMean: 0 },
      }),
      readOptimizerParagraph: async () => paragraph,
      readModelReceipt: async () => ({
        bodyHash: sha256Text(body),
        modelParagraphHash: sha256Text(paragraph),
        objectiveHash: sha256Text(objective),
        baselineBodyHash: sha256Text(sourceSurface.body),
        currentBaselineBodyHash: sha256Text(sourceSurface.body),
        frontmatterHash: sourceSurface.frontmatterHash,
        resourcesHash: sourceSurface.resourcesHash,
      }),
    };
    try {
      const manifest = await runReviseCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: output.root,
        skill: "kibi-usage",
        objective: "  Improve   recovery prose. ",
        headingAnchor: "## Discovery",
        allowPaid: true,
        runId: "revise-receipt-run",
        dependencies: fake,
      });
      expect(manifest.provenance.kind).toBe("model");
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("package assembly receives only candidate body overrides", async () => {
    const output = await tempArtifact("package");
    const manifest = await actualCandidateManifest();
    let inputCandidates: unknown;
    const fake: Partial<CampaignDependencies> = {
      assemble: async (input) => {
        inputCandidates = input.candidates;
        return writeAssembledSkills(input);
      },
    };
    try {
      const receipt = await runPackageCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: output.root,
        manifests: [manifest],
        dependencies: fake,
      });
      expect(receipt.skills).toHaveLength(4);
      expect(inputCandidates).toEqual({
        "kibi-usage": { body: manifest.frozenBody },
      });
      const packageReceipt = JSON.parse(
        await readFile(join(output.root, "package-receipt.json"), "utf8"),
      );
      expect(
        packageReceipt.manifestReadiness.onlyCandidateBodiesChanged,
      ).toEqual(["kibi-usage"]);
      expect(packageReceipt.productionAdoption).toBe("not-performed");
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("rejects forged assembly rows instead of trusting receipt metadata", async () => {
    const manifest = await actualCandidateManifest();
    const cases = [
      {
        name: "duplicate and missing canonical row",
        mutate: (
          skills: Awaited<ReturnType<typeof writeAssembledSkills>>["skills"],
        ) =>
          skills.map((entry, index) =>
            index === skills.length - 1
              ? { ...entry, id: "kibi-usage" as const }
              : entry,
          ),
        error: "package_skill_set_invalid",
      },
      {
        name: "wrong unchanged baseline hash",
        mutate: (
          skills: Awaited<ReturnType<typeof writeAssembledSkills>>["skills"],
        ) =>
          skills.map((entry) =>
            entry.id === "kibi-freshness"
              ? { ...entry, bodyHash: "0".repeat(64) }
              : entry,
          ),
        error: "package_assembly_identity_mismatch",
      },
      {
        name: "false target bodyChanged flag",
        mutate: (
          skills: Awaited<ReturnType<typeof writeAssembledSkills>>["skills"],
        ) =>
          skills.map((entry) =>
            entry.id === "kibi-usage"
              ? { ...entry, bodyChanged: false }
              : entry,
          ),
        error: "package_assembly_identity_mismatch",
      },
    ] as const;
    for (const testCase of cases) {
      const output = await tempArtifact(`package-${testCase.name}`);
      try {
        await expect(
          runPackageCampaign({
            sourceRoot: process.cwd(),
            artifactRoot: output.root,
            manifests: [manifest],
            dependencies: {
              assemble: async (input) => ({
                skills: testCase.mutate(
                  (await writeAssembledSkills(input)).skills,
                ),
              }),
            },
          }),
        ).rejects.toThrow(testCase.error);
      } finally {
        await rm(output.parent, { recursive: true, force: true });
      }
    }
  });

  test("rejects stale package evidence even when the candidate hash is unchanged", async () => {
    const manifest = await actualCandidateManifest();
    const fake = dependencies();
    const evaluationOutput = await tempArtifact("package-evidence-evaluation");
    const packageOutput = await tempArtifact("package-evidence-valid");
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: evaluationOutput.root,
        skill: "kibi-usage",
        manifests: [manifest],
        repeats: 1,
        maxTargetEpisodes: 8,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000004",
        dependencies: defaultCellDependencies(fake.deps, { surface }),
      });
      const packageDependencies = defaultCellDependencies(fake.deps, {
        surface,
        assemble: writeAssembledSkills,
      });
      const valid = await runPackageCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: packageOutput.root,
        manifests: [manifest],
        evaluation,
        dependencies: packageDependencies,
      });
      expect(valid.skills).toHaveLength(4);
      expect(
        JSON.parse(
          await readFile(
            join(packageOutput.root, "package-receipt.json"),
            "utf8",
          ),
        ).evidenceValid,
      ).toBe(true);

      const staleContexts = [
        { sourceHead: "f".repeat(40) },
        { frontmatterHash: "0".repeat(64) },
        { resourcesHash: "0".repeat(64) },
      ] as const;
      for (const [index, patch] of staleContexts.entries()) {
        const staleOutput = await tempArtifact(`package-stale-${index}`);
        try {
          const { contentHash: _contentHash, ...body } = evaluation;
          const staleBody = { ...body, context: { ...body.context, ...patch } };
          const stale = {
            ...staleBody,
            contentHash: contractHash(JsonValueSchema.parse(staleBody)),
          };
          expect(stale.candidates[0]?.frozenBodyHash).toBe(
            manifest.frozenBodyHash,
          );
          await expect(
            runPackageCampaign({
              sourceRoot: process.cwd(),
              artifactRoot: staleOutput.root,
              manifests: [manifest],
              evaluation: stale,
              dependencies: packageDependencies,
            }),
          ).rejects.toThrow("package_evidence_context_stale");
        } finally {
          await rm(staleOutput.parent, { recursive: true, force: true });
        }
      }
    } finally {
      await rm(evaluationOutput.parent, { recursive: true, force: true });
      await rm(packageOutput.parent, { recursive: true, force: true });
    }
  });
});
