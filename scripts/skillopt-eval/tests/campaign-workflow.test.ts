import { describe, expect, test } from "bun:test";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadBundledSkillFrom } from "../../../packages/cli/src/public/skills";
import {
  campaignCandidateHash,
  candidateFrontmatterHash,
  readPublicFeedback,
  replaceCampaignBodyAndDescription,
  sha256Text,
} from "../campaign-artifacts";
import {
  type CampaignDependencies,
  runConfirmCampaign,
  runEvaluateCampaign,
  runPackageCampaign,
  runReviseCampaign,
} from "../campaign-workflow";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { campaignSurface, surface } from "../real-workflow";
import { assembleCanonicalSkills } from "../runtime/skill-assembly";
import {
  actualCandidateManifest,
  candidateManifest,
  defaultCellDependencies,
  dependencies,
  gates,
  sourceSurface,
  tempArtifact,
  trustedSample,
  writeAssembledSkills,
  writeTrustedCell,
} from "./fixtures/campaign-workflow-fixtures";

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
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "evaluate-run",
        dependencies: fake.deps,
      });
      expect(evaluation.status).toBe("complete");
      expect(evaluation.cells).toHaveLength(14);
      expect(evaluation.pairings).toHaveLength(7);
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
        maxTargetEpisodes: 14,
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
        maxTargetEpisodes: 14,
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
          maxTargetEpisodes: 14,
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
          maxTargetEpisodes: 14,
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
            maxTargetEpisodes: 13,
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
          maxTargetEpisodes: 14,
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
        maxTargetEpisodes: 14,
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
        maxTargetEpisodes: 28,
        allowPaid: true,
        runId: "new-run",
        dependencies: fake.deps,
      });
      expect(confirmed.cells).toHaveLength(42);
      expect(confirmed.runs).toEqual([
        {
          runId: "prior-run",
          kind: "prior",
          cellCount: 14,
          repeats: 1,
          artifactRoot: first.root,
        },
        {
          runId: "new-run",
          kind: "new",
          cellCount: 28,
          repeats: 2,
          artifactRoot: second.root,
        },
      ]);
      expect(new Set(confirmed.cells.map((cell) => cell.runId))).toEqual(
        new Set(["prior-run", "new-run"]),
      );
      expect(confirmed.pairings).toHaveLength(21);
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
        maxTargetEpisodes: 14,
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
          maxTargetEpisodes: 14,
          allowPaid: true,
          dependencies: regressionDeps,
        }),
      ).rejects.toThrow("confirmation_noregression_failed");
      const saved = JSON.parse(
        await readFile(join(second.root, "evaluation.json"), "utf8"),
      );
      expect(saved.status).toBe("complete");
      expect(saved.cells).toHaveLength(28);
      expect(saved.aggregate.noRegression).toBe(false);
      const failedState = JSON.parse(
        await readFile(join(second.root, "campaign-state.json"), "utf8"),
      );
      expect(failedState.status).toBe("failed");
      expect(failedState.attemptedCells).toBe(14);
      expect(failedState.cells).toHaveLength(14);
      expect(
        new Set(failedState.cells.map((cell: { runId: string }) => cell.runId)),
      ).toEqual(new Set([saved.runId]));
      expect(failedState.cells).toEqual(
        saved.cells.filter(
          (cell: { runId: string }) => cell.runId === saved.runId,
        ),
      );
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
        maxTargetEpisodes: 14,
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
        maxTargetEpisodes: 14,
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
          maxTargetEpisodes: 14,
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
        maxTargetEpisodes: 14,
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
          maxTargetEpisodes: 14,
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
      expect(receipt.skills).toHaveLength(6);
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
        maxTargetEpisodes: 14,
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
      expect(valid.skills).toHaveLength(6);
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

describe("campaign described candidates", () => {
  async function describedManifest(
    skill: "kibi-usage" | "kibi-bootstrap",
    description: string,
  ) {
    const current = await campaignSurface(process.cwd(), skill);
    return replaceCampaignBodyAndDescription({
      skill,
      surface: current,
      body: current.body,
      description,
    });
  }

  function reseal<T extends { contentHash: string }>(
    evaluation: T,
    patch: (body: Omit<T, "contentHash">) => Omit<T, "contentHash">,
  ): T {
    const { contentHash: _contentHash, ...body } = evaluation;
    const patched = patch(body);
    return {
      ...patched,
      contentHash: contractHash(JsonValueSchema.parse(patched)),
    } as T;
  }

  test("evaluates same-body candidates with different descriptions as distinct arms and confirms only the evaluated descriptions", async () => {
    const first = await tempArtifact("described-evaluate");
    const second = await tempArtifact("described-confirm");
    const third = await tempArtifact("described-tamper");
    const fake = dependencies();
    const candidates: unknown[] = [];
    const deps: Partial<CampaignDependencies> = {
      ...defaultCellDependencies(fake.deps, { surface: campaignSurface }),
      runCell: async (input) => {
        candidates.push(input.candidate);
        return writeTrustedCell(input);
      },
    };
    try {
      const manifests = [
        await describedManifest(
          "kibi-usage",
          "Use for every Kibi lookup, mutation, and validation task.",
        ),
        await describedManifest(
          "kibi-usage",
          "Load before touching requirements, scenarios, tests, or symbols.",
        ),
      ];
      expect(manifests[0]?.frozenBodyHash).toBe(manifests[1]?.frozenBodyHash);
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: first.root,
        skill: "kibi-usage",
        manifests,
        repeats: 1,
        maxTargetEpisodes: 21,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000011",
        dependencies: deps,
      });
      const armHashes = [
        prior.aggregate.baseline.bodyHash,
        ...prior.aggregate.candidates.map((arm) => arm.bodyHash),
      ];
      expect(new Set(armHashes).size).toBe(3);
      expect(prior.aggregate.candidates.map((arm) => arm.bodyHash)).toEqual(
        manifests.map(campaignCandidateHash),
      );
      expect(prior.aggregate.candidates.map((arm) => arm.cells)).toEqual([
        7, 7,
      ]);
      // Each cell assembles exactly the description its arm names.
      expect(new Set(candidates.map((entry) => JSON.stringify(entry)))).toEqual(
        new Set([
          JSON.stringify({ body: manifests[0]?.frozenBody }),
          ...manifests.map((manifest) =>
            JSON.stringify({
              body: manifest.frozenBody,
              description: manifest.frozenDescription,
            }),
          ),
        ]),
      );

      const confirmed = await runConfirmCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: second.root,
        previousEvaluation: prior,
        repeats: 1,
        maxTargetEpisodes: 21,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000012",
        dependencies: deps,
      });
      expect(confirmed.cells).toHaveLength(42);

      const swapped = "Use when an agent must prove Kibi traceability.";
      const tampered = reseal(prior, (body) => ({
        ...body,
        candidates: body.candidates.map((candidate, index) =>
          index === 0
            ? {
                ...candidate,
                frozenDescription: swapped,
                frozenDescriptionHash: sha256Text(swapped),
                candidateFrontmatterHash: candidateFrontmatterHash(
                  loadBundledSkillFrom(
                    join(process.cwd(), "packages/cli/src/public/skills"),
                    "kibi-usage",
                  ).manifest,
                  swapped,
                ),
              }
            : candidate,
        ),
      }));
      fake.calls.length = 0;
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: third.root,
          previousEvaluation: tampered,
          repeats: 1,
          maxTargetEpisodes: 21,
          allowPaid: true,
          runId: "00000000-0000-4000-8000-000000000013",
          dependencies: deps,
        }),
      ).rejects.toThrow("prior_cohort_binding_mismatch");
      expect(fake.calls).not.toContain("canary");
    } finally {
      await rm(first.parent, { recursive: true, force: true });
      await rm(second.parent, { recursive: true, force: true });
      await rm(third.parent, { recursive: true, force: true });
    }
  });

  test("packages a described candidate with evidence and records the description change", async () => {
    const evaluationOutput = await tempArtifact("described-package-eval");
    const packageOutput = await tempArtifact("described-package");
    const fake = dependencies();
    const deps = defaultCellDependencies(fake.deps, {
      surface: campaignSurface,
    });
    const description =
      "Use for any Kibi read, write, or proof step; start here before other Kibi skills.";
    try {
      const manifest = await describedManifest("kibi-usage", description);
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: evaluationOutput.root,
        skill: "kibi-usage",
        manifests: [manifest],
        repeats: 1,
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000014",
        dependencies: deps,
      });
      const receipt = await runPackageCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: packageOutput.root,
        manifests: [manifest],
        evaluation,
        dependencies: deps,
      });
      expect(
        receipt.skills.find((entry) => entry.id === "kibi-usage"),
      ).toMatchObject({
        bodyChanged: false,
        descriptionChanged: true,
        frontmatterHash: manifest.candidateFrontmatterHash,
      });
      const packageReceipt = JSON.parse(
        await readFile(
          join(packageOutput.root, "package-receipt.json"),
          "utf8",
        ),
      );
      expect(packageReceipt.evidenceValid).toBe(true);
      expect(packageReceipt.manifestReadiness).toMatchObject({
        onlyCandidateBodiesChanged: [],
        candidateDescriptionChanges: [
          {
            skill: "kibi-usage",
            baselineFrontmatterHash: manifest.frontmatterHash,
            candidateFrontmatterHash: manifest.candidateFrontmatterHash,
            frozenDescriptionHash: sha256Text(description),
            frozenDescription: description,
          },
        ],
      });
    } finally {
      await rm(evaluationOutput.parent, { recursive: true, force: true });
      await rm(packageOutput.parent, { recursive: true, force: true });
    }
  });

  test("package rejects an assembled described skill whose other frontmatter drifts", async () => {
    const manifest = await describedManifest(
      "kibi-bootstrap",
      "Use first in a repository without a Kibi store to bootstrap it from sources.",
    );
    const cases = [
      {
        name: "version drift",
        assemble: async (
          input: Parameters<CampaignDependencies["assemble"]>[0],
        ) => {
          const receipt = await assembleCanonicalSkills(input);
          const path = join(
            input.workspace,
            ".agents/skills/kibi-bootstrap/SKILL.md",
          );
          const markdown = await readFile(path, "utf8");
          await writeFile(
            path,
            markdown.replace(/^version: .*$/m, "version: 9.9.9"),
          );
          return receipt;
        },
      },
      { name: "description dropped", assemble: writeAssembledSkills },
    ];
    for (const testCase of cases) {
      const output = await tempArtifact(`described-${testCase.name}`);
      try {
        await expect(
          runPackageCampaign({
            sourceRoot: process.cwd(),
            artifactRoot: output.root,
            manifests: [manifest],
            dependencies: { assemble: testCase.assemble },
          }),
        ).rejects.toThrow("package_assembled_surface_mismatch");
      } finally {
        await rm(output.parent, { recursive: true, force: true });
      }
    }
  });
});

describe("campaign harness selection", () => {
  function reseal<T extends { contentHash: string }>(
    evaluation: T,
    patch: (body: Omit<T, "contentHash">) => Omit<T, "contentHash">,
  ): T {
    const { contentHash: _contentHash, ...body } = evaluation;
    const patched = patch(body);
    return {
      ...patched,
      contentHash: contractHash(JsonValueSchema.parse(patched)),
    } as T;
  }

  test("records the run's host and its preflight CLI version in every campaign artifact", async () => {
    const output = await tempArtifact("host-record");
    const fake = dependencies();
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: output.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "host-record-run",
        host: "claude-code",
        dependencies: fake.deps,
      });
      expect(evaluation.context.host).toEqual({
        id: "claude-code",
        cliVersion: "test",
      });
      const campaign = JSON.parse(
        await readFile(join(output.root, "campaign.json"), "utf8"),
      );
      expect(campaign.host).toEqual({ id: "claude-code", cliVersion: "test" });
    } finally {
      await rm(output.parent, { recursive: true, force: true });
    }
  });

  test("confirm refuses evidence from another host before any paid preparation", async () => {
    const first = await tempArtifact("host-prior");
    const second = await tempArtifact("host-confirm");
    const fake = dependencies();
    try {
      const prior = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: first.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "host-prior-run",
        host: "codex",
        dependencies: fake.deps,
      });
      const callsBefore = fake.calls.length;
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: second.root,
          previousEvaluation: prior,
          repeats: 1,
          maxTargetEpisodes: 28,
          allowPaid: true,
          runId: "host-confirm-run",
          host: "claude-code",
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("evaluation_host_mismatch");
      expect(fake.calls.slice(callsBefore)).toEqual([]);
      await expect(
        readFile(join(second.root, "campaign.json"), "utf8"),
      ).rejects.toThrow();

      // An evaluation written before the host was recorded falls back to its
      // run's preflight receipt; one without either is refused.
      const legacy = reseal(prior, (body) => {
        const { host: _host, ...context } = body.context;
        return { ...body, context };
      });
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: second.root,
          previousEvaluation: legacy,
          repeats: 1,
          maxTargetEpisodes: 28,
          allowPaid: true,
          runId: "host-confirm-legacy",
          host: "claude-code",
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("evaluation_host_mismatch");
      await writeFile(
        join(first.root, "preflight.json"),
        JSON.stringify({ ...gates(), codexVersion: null }),
      );
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: second.root,
          previousEvaluation: legacy,
          repeats: 1,
          maxTargetEpisodes: 28,
          allowPaid: true,
          runId: "host-confirm-unrecorded",
          host: "codex",
          dependencies: fake.deps,
        }),
      ).rejects.toThrow("evaluation_host_unrecorded");
      expect(fake.calls.slice(callsBefore)).toEqual([]);
    } finally {
      await rm(first.parent, { recursive: true, force: true });
      await rm(second.parent, { recursive: true, force: true });
    }
  });

  test("package refuses evidence from another host and records the host it packaged for", async () => {
    const manifest = await actualCandidateManifest();
    const fake = dependencies();
    const evaluationOutput = await tempArtifact("host-package-evaluation");
    const packageOutput = await tempArtifact("host-package");
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: evaluationOutput.root,
        skill: "kibi-usage",
        manifests: [manifest],
        repeats: 1,
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000044",
        host: "codex",
        dependencies: defaultCellDependencies(fake.deps, { surface }),
      });
      const packageDependencies = defaultCellDependencies(fake.deps, {
        surface,
        assemble: writeAssembledSkills,
      });
      await expect(
        runPackageCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: packageOutput.root,
          manifests: [manifest],
          evaluation,
          host: "claude-code",
          dependencies: packageDependencies,
        }),
      ).rejects.toThrow("package_evidence_host_mismatch");
      await runPackageCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: packageOutput.root,
        manifests: [manifest],
        evaluation,
        host: "codex",
        dependencies: packageDependencies,
      });
      const receipt = JSON.parse(
        await readFile(
          join(packageOutput.root, "package-receipt.json"),
          "utf8",
        ),
      );
      expect(receipt.host).toEqual({ id: "codex", cliVersion: "test" });
      expect(receipt.evidenceValid).toBe(true);
    } finally {
      await rm(evaluationOutput.parent, { recursive: true, force: true });
      await rm(packageOutput.parent, { recursive: true, force: true });
    }
  });
});

describe("campaign protocol failures", () => {
  test("cells keep the first missing required call and evaluate writes public feedback for revise", async () => {
    const first = await tempArtifact("protocol-evaluate");
    const second = await tempArtifact("protocol-confirm");
    const fake = dependencies();
    try {
      const evaluation = await runEvaluateCampaign({
        sourceRoot: process.cwd(),
        artifactRoot: first.root,
        skill: "kibi-usage",
        manifests: [candidateManifest()],
        repeats: 1,
        maxTargetEpisodes: 14,
        allowPaid: true,
        runId: "00000000-0000-4000-8000-000000000071",
        dependencies: defaultCellDependencies(fake.deps),
      });
      const candidateCells = evaluation.cells.filter(
        (cell) => cell.variant === "candidate-1",
      );
      expect(candidateCells.length).toBeGreaterThan(0);
      for (const cell of candidateCells)
        expect(cell.protocolFailure).toEqual({
          kind: "missing_required_call",
          tool: "kb_query",
          position: 2,
        });
      expect(
        evaluation.cells
          .filter((cell) => cell.variant === "baseline")
          .every((cell) => cell.protocolFailure === undefined),
      ).toBe(true);
      const feedback = await readPublicFeedback(
        join(first.root, "public-feedback.json"),
      );
      expect(feedback.observations.length).toBeGreaterThan(0);
      expect(
        feedback.observations.every((item) =>
          item.observation.startsWith(
            "Protocol failed for candidate-1: required call 2 (kb_query)",
          ),
        ),
      ).toBe(true);

      // A prior cell whose recorded failure no longer matches its receipt is
      // refused on confirm.
      const { contentHash: _contentHash, ...body } = evaluation;
      const tamperedBody = {
        ...body,
        cells: body.cells.map((cell) =>
          cell.variant === "candidate-1"
            ? {
                ...cell,
                protocolFailure: {
                  kind: "missing_required_call" as const,
                  tool: "kb_check",
                  position: 3,
                },
              }
            : cell,
        ),
      };
      await expect(
        runConfirmCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: second.root,
          previousEvaluation: {
            ...tamperedBody,
            contentHash: contractHash(JsonValueSchema.parse(tamperedBody)),
          },
          repeats: 1,
          maxTargetEpisodes: 28,
          allowPaid: true,
          runId: "00000000-0000-4000-8000-000000000072",
          dependencies: defaultCellDependencies(fake.deps),
        }),
      ).rejects.toThrow("prior_cell_evidence_mismatch");
    } finally {
      await rm(first.parent, { recursive: true, force: true });
      await rm(second.parent, { recursive: true, force: true });
    }
  });
});
